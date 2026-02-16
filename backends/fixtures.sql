--
-- Fixture data
--
-- The following creates some fixture data to work with,
-- with one Post, some top-level Comments,
-- and some nested replies (at different levels of nesting).
--
-- The hierarchy of the fixture Post and its Comment replies
-- can be visualized like so:
-- - new_post
--   - comment_1
--     - reply_1a
--       - reply_1a_a
--         - reply_1a_a_a
--     - reply_1b
--   - comment_2
--     - reply_2a
--     - reply_2b
--
-- NOTE: We use CTEs (the `WITH` clause) to return the randomized IDs of the new objects
-- and then re-use those IDs to establish the parent post and parent comment, if any.
--
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

--
-- Following adds a set of extra votes to different posts and comments
--
WITH
    first_post AS (SELECT id FROM posts LIMIT 1),
    comment_1 AS (
        SELECT id FROM comments
        WHERE post_id IN (SELECT id FROM first_post)
          AND parent_comment_id IS NULL
        ORDER BY created_at ASC LIMIT 1
    ),
    comment_2 AS (
        SELECT id FROM comments
        WHERE post_id IN (SELECT id FROM first_post)
          AND parent_comment_id IS NULL
        ORDER BY created_at ASC OFFSET 1 LIMIT 1
    )
-- 2 votes on the post
INSERT INTO votes (voter, object_id, object_type, vote_value) VALUES
    ('alice',   (SELECT id FROM first_post), 'Post', 1),
    ('bob',     (SELECT id FROM first_post), 'Post', 1),
-- 2 votes on comment_1
    ('alice',   (SELECT id FROM comment_1),  'Comment', 1),
    ('charlie', (SELECT id FROM comment_1),  'Comment', 1),
-- 1 vote on comment_2
    ('bob',     (SELECT id FROM comment_2),  'Comment', 1);
