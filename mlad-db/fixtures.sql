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
    -- Users
    user_griceturrble_id UUID;
    user_ferris_fan_id UUID;
    user_pragmatic_dev_id UUID;
    user_crab_lover_id UUID;
    user_weekend_coder_id UUID;
    user_snake_charmer_id UUID;
    user_async_await_id UUID;
    user_rustacean42_id UUID;
    user_safe_threads_id UUID;
    user_alice_id UUID;
    user_bob_id UUID;
    user_charlie_id UUID;
    -- Fixture password hash for "testpassword123" (argon2id)
    fixture_password_hash TEXT := '$argon2id$v=19$m=65536,t=3,p=4$VQrBmDPmXMtZSwlhLGWsdQ$CrgJXe/LjkxRdDxXLAhoLfx1LU5482YgtdvxJ5co+EM';
    -- Posts and comments
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

        -- Insert all users first
        INSERT INTO users (email, username, password_hash)
        VALUES ('test_griceturrble@example.com', 'test_griceturrble', fixture_password_hash)
        RETURNING id INTO user_griceturrble_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_ferris_fan@example.com', 'test_ferris_fan', fixture_password_hash)
        RETURNING id INTO user_ferris_fan_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_pragmatic_dev@example.com', 'test_pragmatic_dev', fixture_password_hash)
        RETURNING id INTO user_pragmatic_dev_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_crab_lover@example.com', 'test_crab_lover', fixture_password_hash)
        RETURNING id INTO user_crab_lover_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_weekend_coder@example.com', 'test_weekend_coder', fixture_password_hash)
        RETURNING id INTO user_weekend_coder_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_snake_charmer@example.com', 'test_snake_charmer', fixture_password_hash)
        RETURNING id INTO user_snake_charmer_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_async_await@example.com', 'test_async_await', fixture_password_hash)
        RETURNING id INTO user_async_await_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_rustacean42@example.com', 'test_rustacean42', fixture_password_hash)
        RETURNING id INTO user_rustacean42_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_safe_threads@example.com', 'test_safe_threads', fixture_password_hash)
        RETURNING id INTO user_safe_threads_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_alice@example.com', 'test_alice', fixture_password_hash)
        RETURNING id INTO user_alice_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_bob@example.com', 'test_bob', fixture_password_hash)
        RETURNING id INTO user_bob_id;

        INSERT INTO users (email, username, password_hash)
        VALUES ('test_charlie@example.com', 'test_charlie', fixture_password_hash)
        RETURNING id INTO user_charlie_id;

        RAISE NOTICE 'Users inserted successfully';

        -- Insert new post and save its ID
        INSERT INTO posts (title, body, author_id)
        VALUES ('What is your favorite programming language?', 'Genuinely curious what everyone is using these days and why.', user_griceturrble_id)
        RETURNING id INTO new_post_id;

        -- Insert top-level comments and save their IDs
        INSERT INTO comments (post_id, body, author_id)
        VALUES (new_post_id, 'Rust. The borrow checker is annoying at first, but once it clicks you never want to go back.', user_ferris_fan_id)
        RETURNING id, post_id INTO comment_1_id, comment_1_post_id;

        INSERT INTO comments (post_id, body, author_id)
        VALUES (new_post_id, 'Python for prototyping, Go for production. Best of both worlds.', user_pragmatic_dev_id)
        RETURNING id, post_id INTO comment_2_id, comment_2_post_id;

        -- Replies to comment_1
        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (comment_1_post_id, comment_1_id, 'Agreed. Rust error messages are surprisingly helpful too.', user_crab_lover_id)
        RETURNING id, post_id INTO reply_1a_id, reply_1a_post_id;

        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (comment_1_post_id, comment_1_id, 'I tried Rust for a weekend and gave up. Maybe I should try again.', user_weekend_coder_id)
        RETURNING id INTO reply_1b_id;

        -- Replies to comment_2
        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (comment_2_post_id, comment_2_id, 'This is the way. Python is unbeatable for quick scripts.', user_snake_charmer_id)
        RETURNING id INTO reply_2a_id;

        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (comment_2_post_id, comment_2_id, 'Have you tried FastAPI? It almost makes Python feel production-ready.', user_async_await_id)
        RETURNING id INTO reply_2b_id;

        -- Depth 3: reply to reply_1a
        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (reply_1a_post_id, reply_1a_id, 'Honestly the compiler practically writes the code for you at that point.', user_rustacean42_id)
        RETURNING id, post_id INTO reply_1a_a_id, reply_1a_a_post_id;

        -- Depth 4: reply to reply_1a_a
        INSERT INTO comments (post_id, parent_comment_id, body, author_id)
        VALUES (reply_1a_a_post_id, reply_1a_a_id, 'Once you embrace ownership, multithreading isn''t scary anymore.', user_safe_threads_id)
        RETURNING id INTO reply_1a_a_a_id;

        RAISE NOTICE 'Comments and replies inserted successfully';

        --
        -- Add a set of extra votes to different posts and comments
        --
        -- 2 votes on the post
        INSERT INTO votes (voter_id, object_id, object_type, vote_value) VALUES
            (user_alice_id,   new_post_id, 'Post', 1),
            (user_bob_id,     new_post_id, 'Post', 1),
        -- 2 votes on comment_1
            (user_alice_id,   comment_1_id,  'Comment', 1),
            (user_charlie_id, comment_1_id,  'Comment', 1),
        -- 1 vote on comment_2
            (user_bob_id,     comment_2_id,  'Comment', 1);

        RAISE NOTICE 'Votes generated';

    ELSE
        RAISE NOTICE 'Posts already exist. Clear data first to re-run';
    END IF;
END
$$;
