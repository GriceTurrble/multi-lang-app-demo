# Data specification

Backend data will be stored in Postgres.
The structure of this data can be found in [schema.sql](schema.sql).

## Testing

### Postgres image

A throwaway Postgres image can be created using the following:

```shell
docker run --rm -d \
    --name test-postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=testdb \
    -p 5432:5432 \
    postgres:latest
```

### Fixture data

See [fixtures.sql](fixtures.sql).

## Common scripts for accessing data

### See all posts
```sql
SELECT * FROM posts
```

### Top-level Comments of a Post, without replies

> [!note]
> In the application,
> we should know the `post_id` already we are requesting,
> so there is no need for the `WITH first_post` CTE at all.
> Just use `WHERE post_id = :post_id` instead!
>
> We use the `WITH` clause in this example just to grab the fixture post
> without needing to know its randomized ID ahead of time.

```sql
WITH first_post AS (SELECT id from posts LIMIT 1)
SELECT * FROM comments
WHERE 1=1
    AND post_id in (select id from first_post)
    -- Top-level comments have no parent comment
    AND parent_comment_id IS NULL
```

### Returning the comment tree for a Post

For a **Post**, return the comment tree up to `n` levels deep.

- All top-level comments are returned, up to `replies_page_size` (default 10).
- For each top-level comment, up to `replies_page_size` replies are returned recursively, up to `max_depth` levels deep (default 1).
- Pagination uses **keyset/cursor-based** paging on top-level comments: pass `cursor_id` (the `id` of the last top-level comment from the previous page) to fetch the next page. Set `cursor_id` to `NULL` for the first page.
    - The `created_at` time of the `cursor_id` comment is used to ensure that only comments made *after* the previously-selected Comment are returned.
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
        WHERE 1=1
            AND post_id IN (SELECT id FROM first_post)
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

### Returning the reply tree for a Comment

For a single **Comment**, return the reply tree up to `n` levels deep.

- The target comment must match both the given `post_id` and `comment_id`; otherwise return 404.
- Up to `replies_page_size` direct replies are returned, with keyset pagination via `cursor_id`.
- Replies are fetched recursively up to `max_depth` levels deep.
- The target comment itself is **not** included in the results; only its replies are returned.

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
        WHERE 1=1
            AND post_id IN (SELECT id FROM first_post)
            AND parent_comment_id IS NULL
        ORDER BY created_at ASC, id ASC
        LIMIT 1
    ),
    -- The target comment (must match both post_id and comment_id)
    target_comment AS (
        SELECT *, 0 AS depth
        FROM comments
        WHERE 1=1
            AND id IN (SELECT id FROM comment_1)
            AND post_id IN (SELECT id FROM first_post)
    ),
    -- Direct replies to the target comment, with keyset pagination
    direct_replies AS (
        SELECT *, 1 AS depth
        FROM comments
        WHERE 1=1
            AND parent_comment_id = (SELECT id FROM target_comment)
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
