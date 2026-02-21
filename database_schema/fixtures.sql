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
DO
$$
DECLARE
    new_post_id UUID;
    comment_1_id UUID;
    comment_1_post_id UUID;
    comment_2_id UUID;
    comment_2_post_id UUID;
    reply_1a_id UUID;
    reply_1a_post_id UUID;
    reply_1b_id UUID;
    reply_2a_id UUID;
    reply_2b_id UUID;
    reply_1a_a_id UUID;
    reply_1a_a_post_id UUID;
    reply_1a_a_a_id UUID;
BEGIN
    -- Only insert fixture data if there are no posts in the database
    IF NOT EXISTS (SELECT 1 FROM posts LIMIT 1) THEN

        -- Insert new post and save its ID
        INSERT INTO posts (title, body, author)
        VALUES ('What is your favorite programming language?', 'Genuinely curious what everyone is using these days and why.', 'griceturrble')
        RETURNING id INTO new_post_id;

        -- Insert top-level comments and save their IDs
        INSERT INTO comments (post_id, body, author)
        VALUES (new_post_id, 'Rust. The borrow checker is annoying at first, but once it clicks you never want to go back.', 'ferris_fan')
        RETURNING id, post_id INTO comment_1_id, comment_1_post_id;

        INSERT INTO comments (post_id, body, author)
        VALUES (new_post_id, 'Python for prototyping, Go for production. Best of both worlds.', 'pragmatic_dev')
        RETURNING id, post_id INTO comment_2_id, comment_2_post_id;

        -- Replies to comment_1
        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (comment_1_post_id, comment_1_id, 'Agreed. Rust error messages are surprisingly helpful too.', 'crab_lover')
        RETURNING id, post_id INTO reply_1a_id, reply_1a_post_id;

        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (comment_1_post_id, comment_1_id, 'I tried Rust for a weekend and gave up. Maybe I should try again.', 'weekend_coder')
        RETURNING id INTO reply_1b_id;

        -- Replies to comment_2
        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (comment_2_post_id, comment_2_id, 'This is the way. Python is unbeatable for quick scripts.', 'snake_charmer')
        RETURNING id INTO reply_2a_id;

        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (comment_2_post_id, comment_2_id, 'Have you tried FastAPI? It almost makes Python feel production-ready.', 'async_await')
        RETURNING id INTO reply_2b_id;

        -- Depth 3: reply to reply_1a
        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (reply_1a_post_id, reply_1a_id, 'Honestly the compiler practically writes the code for you at that point.', 'rustacean42')
        RETURNING id, post_id INTO reply_1a_a_id, reply_1a_a_post_id;

        -- Depth 4: reply to reply_1a_a
        INSERT INTO comments (post_id, parent_comment_id, body, author)
        VALUES (reply_1a_a_post_id, reply_1a_a_id, 'Once you embrace ownership, multithreading isn''t scary anymore.', 'safe_threads')
        RETURNING id INTO reply_1a_a_a_id;

        RAISE NOTICE 'Comments and replies inserted successfully';

        --
        -- Add a set of extra votes to different posts and comments
        --
        -- 2 votes on the post
        INSERT INTO votes (voter, object_id, object_type, vote_value) VALUES
            ('alice',   new_post_id, 'Post', 1),
            ('bob',     new_post_id, 'Post', 1),
        -- 2 votes on comment_1
            ('alice',   comment_1_id,  'Comment', 1),
            ('charlie', comment_1_id,  'Comment', 1),
        -- 1 vote on comment_2
            ('bob',     comment_2_id,  'Comment', 1);

        RAISE NOTICE 'Votes generated';

    ELSE
        RAISE NOTICE 'Posts already exist. Clear data first to re-run';
    END IF;
END
$$;

SELECT 'Fixture load complete' AS run_status;
