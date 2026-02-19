--
-- Backend data schema
--

--
-- Post instances
--
CREATE TABLE IF NOT EXISTS posts (
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
CREATE TABLE IF NOT EXISTS comments (
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
CREATE TABLE IF NOT EXISTS votes (
    voter VARCHAR(100) NOT NULL,
    object_id UUID NOT NULL,
    object_type VARCHAR(20) NOT NULL REFERENCES object_types (name),
    vote_value SMALLINT NOT NULL DEFAULT 1 CHECK (vote_value IN (1, -1)),
    UNIQUE (object_id, object_type, voter)
);

--
-- Trigger function: recalculate vote_score on the affected object
-- whenever a vote is inserted.
-- Looks up the target table from object_types, then sets vote_score
-- to the sum of all vote_value entries for that object.
--
CREATE OR REPLACE FUNCTION update_vote_score()
RETURNS TRIGGER AS $$
DECLARE
    target_table TEXT;
BEGIN
    SELECT ot.table_name INTO target_table
    FROM object_types ot
    WHERE ot.name = NEW.object_type;

    IF target_table IS NULL THEN
        RAISE EXCEPTION 'Unknown object_type: %', NEW.object_type;
    END IF;

    EXECUTE format(
        'UPDATE %I SET vote_score = (
            SELECT COALESCE(SUM(vote_value), 0)
            FROM votes
            WHERE object_id = $1 AND object_type = $2
        ) WHERE id = $1',
        target_table
    ) USING NEW.object_id, NEW.object_type;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_vote_score
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_vote_score();

--
-- Trigger function: auto-upvote a Post on creation.
-- Inserts a vote from the post's author, which in turn fires
-- trg_update_vote_score to set vote_score to 1.
--
CREATE OR REPLACE FUNCTION auto_upvote_post()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO votes (voter, object_id, object_type, vote_value)
    VALUES (NEW.author, NEW.id, 'Post', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auto_upvote_post
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION auto_upvote_post();

--
-- Trigger function: auto-upvote a Comment on creation.
-- Inserts a vote from the comment's author, which in turn fires
-- trg_update_vote_score to set vote_score to 1.
--
CREATE OR REPLACE FUNCTION auto_upvote_comment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO votes (voter, object_id, object_type, vote_value)
    VALUES (NEW.author, NEW.id, 'Comment', 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_auto_upvote_comment
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION auto_upvote_comment();

--
-- Stored function: get the comment tree for a Post.
-- Returns top-level comments with recursive replies up to `p_max_depth` levels.
-- Uses keyset/cursor-based pagination on top-level comments:
--   pass `p_cursor_id` (the id of the last top-level comment from the previous page)
--   or NULL for the first page.
-- Replies within each parent are not cursor-paginated; use get_reply_tree for that.
--
CREATE OR REPLACE FUNCTION get_comment_tree(
    p_post_id UUID,
    p_max_depth INTEGER DEFAULT 2,
    p_page_size INTEGER DEFAULT 10,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    parent_comment_id UUID,
    author VARCHAR(100),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    vote_score INTEGER,
    depth INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE
        top_comments AS (
            SELECT c.*, 0 AS depth
            FROM comments c
            WHERE c.post_id = p_post_id
                AND c.parent_comment_id IS NULL
                AND (
                    p_cursor_id IS NULL
                    OR (c.created_at, c.id) > (
                        (SELECT cc.created_at FROM comments cc WHERE cc.id = p_cursor_id),
                        p_cursor_id
                    )
                )
            ORDER BY c.created_at ASC, c.id ASC
            LIMIT p_page_size
        ),
        comment_tree AS (
            SELECT tc.id, tc.post_id, tc.parent_comment_id, tc.author, tc.body,
                tc.created_at, tc.updated_at, tc.vote_score, tc.depth
            FROM top_comments tc

            UNION ALL

            SELECT c.id, c.post_id, c.parent_comment_id, c.author, c.body,
                c.created_at, c.updated_at, c.vote_score, ct.depth + 1
            FROM comment_tree ct
            JOIN LATERAL (
                SELECT *
                FROM comments
                WHERE comments.parent_comment_id = ct.id
                ORDER BY comments.created_at ASC, comments.id ASC
                LIMIT p_page_size
            ) c ON TRUE
            WHERE ct.depth < p_max_depth
        )
    SELECT * FROM comment_tree
    ORDER BY comment_tree.depth, comment_tree.created_at ASC, comment_tree.id ASC;
END;
$$ LANGUAGE plpgsql;

--
-- Stored function: get the reply tree for a single Comment.
-- Returns replies to the given comment recursively up to `p_max_depth` levels.
-- The target comment itself is NOT included in results.
-- Uses keyset/cursor-based pagination on direct replies:
--   pass `p_cursor_id` (the id of the last direct reply from the previous page)
--   or NULL for the first page.
--
CREATE OR REPLACE FUNCTION get_reply_tree(
    p_post_id UUID,
    p_comment_id UUID,
    p_max_depth INTEGER DEFAULT 2,
    p_page_size INTEGER DEFAULT 10,
    p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    parent_comment_id UUID,
    author VARCHAR(100),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    vote_score INTEGER,
    depth INTEGER
) AS $$
BEGIN
    -- Verify the target comment exists and belongs to the given post
    IF NOT EXISTS (
        SELECT 1 FROM comments c
        WHERE c.id = p_comment_id AND c.post_id = p_post_id
    ) THEN
        -- Return empty result set; the backend should interpret this as 404
        RETURN;
    END IF;

    RETURN QUERY
    WITH RECURSIVE
        direct_replies AS (
            SELECT c.*, 1 AS depth
            FROM comments c
            WHERE c.parent_comment_id = p_comment_id
                AND (
                    p_cursor_id IS NULL
                    OR (c.created_at, c.id) > (
                        (SELECT cc.created_at FROM comments cc WHERE cc.id = p_cursor_id),
                        p_cursor_id
                    )
                )
            ORDER BY c.created_at ASC, c.id ASC
            LIMIT p_page_size
        ),
        comment_tree AS (
            SELECT dr.id, dr.post_id, dr.parent_comment_id, dr.author, dr.body,
                dr.created_at, dr.updated_at, dr.vote_score, dr.depth
            FROM direct_replies dr

            UNION ALL

            SELECT c.id, c.post_id, c.parent_comment_id, c.author, c.body,
                c.created_at, c.updated_at, c.vote_score, ct.depth + 1
            FROM comment_tree ct
            JOIN LATERAL (
                SELECT *
                FROM comments
                WHERE comments.parent_comment_id = ct.id
                ORDER BY comments.created_at ASC, comments.id ASC
                LIMIT p_page_size
            ) c ON TRUE
            WHERE ct.depth < p_max_depth
        )
    SELECT * FROM comment_tree
    ORDER BY comment_tree.depth, comment_tree.created_at ASC, comment_tree.id ASC;
END;
$$ LANGUAGE plpgsql;

SELECT 'Schema load complete' AS run_status;
