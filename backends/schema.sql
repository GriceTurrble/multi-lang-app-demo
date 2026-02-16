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
