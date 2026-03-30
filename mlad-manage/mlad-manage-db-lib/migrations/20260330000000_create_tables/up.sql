CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    title TEXT,
    body TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    vote_score INTEGER NOT NULL DEFAULT 1
);


CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
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
CREATE TABLE object_types (
    name VARCHAR(100) PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL
);

INSERT INTO object_types (name, table_name)
VALUES
    ('Post', 'posts'),
    ('Comment', 'comments');


--
-- Votes may apply to either Posts or Comments.
-- `vote_value` must be either 1 or -1 so that they can be summed up properly.
--
CREATE TABLE votes (
    -- NO, NOT THAT KIND OF VOTER ID
    voter_id UUID NOT NULL REFERENCES users(id),
    object_id UUID NOT NULL,
    object_type VARCHAR(20) NOT NULL REFERENCES object_types(name),
    vote_value SMALLINT NOT NULL DEFAULT 1 CHECK (vote_value IN (1, -1)),
    UNIQUE (object_id, object_type, voter_id)
);
