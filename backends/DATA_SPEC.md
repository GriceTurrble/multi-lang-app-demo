# Data specification

Backend data should be expected in the following table format in a Postgres data store:

```sql
--
-- Post instances
--
CREATE TABLE
    IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT uuidv7 (),
        title TEXT,
        body TEXT NOT NULL,
        author VARCHAR(100) NOT NULL,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            vote_score INTEGER NOT NULL DEFAULT 1
    );

--
-- Comment instances
--
CREATE TABLE
    IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuidv7 (),
        post_id UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        parent_comment_id UUID REFERENCES comments (id) ON DELETE CASCADE,
        author VARCHAR(100) NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        vote_score INTEGER NOT NULL DEFAULT 1
    );

--
-- Object types
-- This is a polymorphic system in which some items may relate to one of many types of objects.
-- When a table includes a foreign key `foo_object_id` and `foo_object_type`,
-- the `object_type` value should be looked up first in the `object_types` table
-- to determine the object table where this object resides.
-- The app can then lookup the object_id in the given table to find the object it needs as a reference.
--
CREATE TABLE IF NOT EXISTS object_types (
    name VARCHAR(100) PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL
);
INSERT INTO object_types (name, table_name)
VALUES
    ('Post', 'posts'),
    ('Comment', 'comments')
ON CONFLICT (name) DO NOTHING;

--
-- Vote instances
-- Votes may apply to either Posts or Comments.
-- `vote_value` must be either 1 or -1 so that they can be summed up properly.
--
CREATE TABLE
    IF NOT EXISTS votes (
        voter VARCHAR(100) NOT NULL,
        object_id UUID NOT NULL,
        object_type VARCHAR(20) NOT NULL REFERENCES object_types (name),
        vote_value SMALLINT NOT NULL DEFAULT 1 CHECK (vote_value IN (1, -1)),
        UNIQUE (object_id, object_type, voter)
    );
```

## Test fixture data

```sql
-- Sample fixture data
-- Creates 1 Post, 2 top-level Comments, 2 replies to each Comment,
-- and 2 additional levels of replies on the first reply.

WITH new_post AS (
    INSERT INTO posts (title, body, author)
    VALUES ('What is your favorite programming language?', 'Genuinely curious what everyone is using these days and why.', 'griceturrble')
    RETURNING id
),
comment_1 AS (
    INSERT INTO comments (post_id, body, author)
    SELECT id, 'Rust. The borrow checker is annoying at first, but once it clicks you never want to go back.', 'ferris_fan'
    FROM new_post
    RETURNING id, post_id
),
comment_2 AS (
    INSERT INTO comments (post_id, body, author)
    SELECT id, 'Python for prototyping, Go for production. Best of both worlds.', 'pragmatic_dev'
    FROM new_post
    RETURNING id, post_id
),
reply_1a AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT c.post_id, c.id, 'Agreed. Rust error messages are surprisingly helpful too.', 'crab_lover'
    FROM comment_1 c
    RETURNING id, post_id
),
reply_1b AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT c.post_id, c.id, 'I tried Rust for a weekend and gave up. Maybe I should try again.', 'weekend_coder'
    FROM comment_1 c
    RETURNING id
),
reply_2a AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT c.post_id, c.id, 'This is the way. Python is unbeatable for quick scripts.', 'snake_charmer'
    FROM comment_2 c
    RETURNING id
),
reply_2b AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT c.post_id, c.id, 'Have you tried FastAPI? It almost makes Python feel production-ready.', 'async_await'
    FROM comment_2 c
    RETURNING id
),
-- Depth 3: reply to reply_1a
reply_1a_a AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT r.post_id, r.id, 'Honestly the compiler practically writes the code for you at that point.', 'rustacean42'
    FROM reply_1a r
    RETURNING id, post_id
),
-- Depth 4: reply to reply_1a_a
reply_1a_a_a AS (
    INSERT INTO comments (post_id, parent_comment_id, body, author)
    SELECT r.post_id, r.id, 'Ok now you are just mass-producing mass-produced mass production.', 'deeply_nested'
    FROM reply_1a_a r
    RETURNING id
)
SELECT 'Fixtures inserted successfully.' AS result;
```

## Example scripts for accessing fixtures

### See all posts
```sql
SELECT * FROM posts
```

### Top-level comments on first-returned post

> [!note]
> If you know the `post_id` already,
> there is no need for the `WITH first_post AS` condition:
> just use `post_id = ...`!
>
> This is used just to read from fixture data automatically,
> where IDs are randomized on entry.

```sql
WITH first_post AS (SELECT id from posts LIMIT 1)
SELECT * FROM comments
WHERE 1=1
    AND post_id in (select id from first_post)
    -- Top-level comments have no parent comment
    AND parent_comment_id IS NULL
```

### Replies to each top-level comment

**First** (note the `ORDER BY ... ASC`):

```sql
WITH
    first_post AS (SELECT id FROM posts LIMIT 1),
    top_comment1 AS (
        SELECT * FROM comments
        WHERE 1=1
            AND post_id in (SELECT id FROM first_post)
            AND parent_comment_id IS NULL
        ORDER BY id ASC
        LIMIT 1
    )
SELECT * FROM comments WHERE post_id in (select id from first_post)
AND parent_comment_id in (select id from top_comment1)
```

**Second** (`ORDER BY ... DESC`):

```sql
WITH
    first_post AS (SELECT id FROM posts LIMIT 1),
    top_comment2 AS (
        SELECT * FROM comments
        WHERE 1=1
            AND post_id in (SELECT id FROM first_post)
            AND parent_comment_id IS NULL
        ORDER BY id DESC
        LIMIT 1
    )
SELECT * FROM comments WHERE post_id in (select id from first_post)
AND parent_comment_id in (select id from top_comment2)
```

### Returning n-level replies for a Post

For a **Post**, return the comment tree up to `n` levels deep.

- All top-level comments are returned, up to `replies_page_size` (default 10).
- For each top-level comment, up to `replies_page_size` replies are returned recursively, up to `max_depth` levels deep (default 1).
- Pagination uses **keyset/cursor-based** paging on top-level comments: pass `cursor_id` (the `id` of the last top-level comment from the previous page) to fetch the next page. Set `cursor_id` to `NULL` for the first page.
- The query resolves `created_at` from the `cursor_id` automatically, so only one cursor value is needed.
- Replies within each parent are always returned from the beginning (not cursor-paginated); deeper reply pagination should use the single-comment endpoint.

```sql
WITH RECURSIVE
    -- Replace the use of `params`
    -- with variables within the application.
    -- `cursor_id` should be NULL for the first page.
    -- For subsequent pages, pass the `id` of the last top-level comment
    -- from the previous page.
    params AS (
        SELECT
            1 AS max_depth,
            10 AS replies_page_size,
            NULL::uuid AS cursor_id
    ),
    -- TODO in the app, do not use `first_post`,
    -- but instead have a query for a specific `post_id`
    first_post AS (SELECT id FROM posts LIMIT 1),
    -- Top-level comments for this post (up to `replies_page_size`),
    -- using keyset pagination via (created_at, id) cursor
    top_comments AS (
        SELECT *, 0 AS depth
        FROM comments
        WHERE post_id IN (SELECT id FROM first_post)
            AND parent_comment_id IS NULL
            AND (
                (SELECT cursor_id FROM params) IS NULL
                OR (created_at, id) > (
                    (SELECT created_at FROM comments WHERE id = (SELECT cursor_id FROM params)),
                    (SELECT cursor_id FROM params)
                )
            )
        ORDER BY created_at ASC, id ASC
        LIMIT (SELECT replies_page_size FROM params)
    ),
    -- Recursively fetch replies up to max_depth levels,
    -- limited to `replies_page_size` replies per parent at each level
    comment_tree AS (
        SELECT id, post_id, parent_comment_id, author, body,
            created_at, updated_at, vote_score, depth
        FROM top_comments

        UNION ALL

        SELECT c.id, c.post_id, c.parent_comment_id, c.author, c.body,
            c.created_at, c.updated_at, c.vote_score, ct.depth + 1
        FROM comment_tree ct
        JOIN LATERAL (
            SELECT *
            FROM comments
            WHERE parent_comment_id = ct.id
            ORDER BY created_at ASC, id ASC
            LIMIT (SELECT replies_page_size FROM params)
        ) c ON TRUE
        WHERE ct.depth < (SELECT max_depth FROM params)
    )
SELECT * FROM comment_tree
ORDER BY depth, created_at ASC, id ASC;
```

### Returning replies to any single Comment

For a single **Comment**, return the reply tree up to `n` levels deep.

- The target comment must match both the given `post_id` and `comment_id`; otherwise return 404.
- Up to `replies_page_size` direct replies are returned, with keyset pagination via `cursor_id`.
- Replies are fetched recursively up to `max_depth` levels deep.
- The target comment itself is **not** included in the results; only its replies are returned.

> [!note]
> Example post ID: `019c5780-af42-7a37-98f6-31af2af9a4e1`
> Example comment ID: `019c5780-af43-747d-8d6b-a76f983ce8c1`

```sql
WITH RECURSIVE
    params AS (
        SELECT
            2 AS max_depth,
            10 AS replies_page_size,
            NULL::uuid AS cursor_id
    ),
    -- TODO in the app, do not use `first_post` / `comment_1`,
    -- but instead use specific `post_id` and `comment_id` values
    first_post AS (SELECT id FROM posts LIMIT 1),
    comment_1 AS (
        SELECT id FROM comments
        WHERE post_id IN (SELECT id FROM first_post)
            AND parent_comment_id IS NULL
        ORDER BY created_at ASC, id ASC
        LIMIT 1
    ),
    -- The target comment (must match both post_id and comment_id)
    target_comment AS (
        SELECT *, 0 AS depth
        FROM comments
        WHERE id IN (SELECT id FROM comment_1)
            AND post_id IN (SELECT id FROM first_post)
    ),
    -- Direct replies to the target comment, with keyset pagination
    direct_replies AS (
        SELECT *, 1 AS depth
        FROM comments
        WHERE parent_comment_id = (SELECT id FROM target_comment)
            AND (
                (SELECT cursor_id FROM params) IS NULL
                OR (created_at, id) > (
                    (SELECT created_at FROM comments WHERE id = (SELECT cursor_id FROM params)),
                    (SELECT cursor_id FROM params)
                )
            )
        ORDER BY created_at ASC, id ASC
        LIMIT (SELECT replies_page_size FROM params)
    ),
    -- Recursively fetch deeper replies
    comment_tree AS (
        SELECT id, post_id, parent_comment_id, author, body,
            created_at, updated_at, vote_score, depth
        FROM direct_replies

        UNION ALL

        SELECT c.id, c.post_id, c.parent_comment_id, c.author, c.body,
            c.created_at, c.updated_at, c.vote_score, ct.depth + 1
        FROM comment_tree ct
        JOIN LATERAL (
            SELECT *
            FROM comments
            WHERE parent_comment_id = ct.id
            ORDER BY created_at ASC, id ASC
            LIMIT (SELECT replies_page_size FROM params)
        ) c ON TRUE
        WHERE ct.depth < (SELECT max_depth FROM params)
    )
SELECT * FROM comment_tree
ORDER BY depth, created_at ASC, id ASC;
```
