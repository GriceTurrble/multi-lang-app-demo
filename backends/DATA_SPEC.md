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

```sql
SELECT * FROM comments
WHERE 1=1
    AND post_id = :post_id
    -- Top-level comments have no parent comment
    AND parent_comment_id IS NULL
```

### Returning the comment tree for a Post

Use the `get_comment_tree` stored function (see [schema.sql] for its definition):

```sql
SELECT
    id,
    post_id,
    parent_comment_id,
    author,
    body,
    created_at,
    updated_at,
    vote_score,
    depth
FROM get_comment_tree(
    p_post_id := :post_id,
    p_max_depth := 2,
    p_page_size := 10,
    p_cursor_id := NULL  -- pass last top-level comment id for next page
);
```

- Returns top-level comments with recursive replies up to `p_max_depth` levels.
- Pagination is **keyset/cursor-based** on top-level comments: pass `p_cursor_id` (the `id` of the last top-level comment from the previous page) to fetch the next page, or `NULL` for the first page.
- Replies within each parent are always returned from the beginning (not cursor-paginated); use `get_reply_tree` for deeper pagination.

### Returning the reply tree for a Comment

Use the `get_reply_tree` stored function (see [schema.sql] for its definition):

```sql
SELECT
    id,
    post_id,
    parent_comment_id,
    author,
    body,
    created_at,
    updated_at,
    vote_score,
    depth
FROM get_reply_tree(
    p_post_id := :post_id,
    p_comment_id := :comment_id,
    p_max_depth := 2,
    p_page_size := 10,
    p_cursor_id := NULL  -- pass last direct reply id for next page
);
```

- The target comment must match both the given `p_post_id` and `p_comment_id`; an empty result set means the comment was not found (backend should return 404).
- The target comment itself is **not** included in the results; only its replies are returned.
- Pagination is **keyset/cursor-based** on direct replies: pass `p_cursor_id` for subsequent pages, or `NULL` for the first page.
- Replies are fetched recursively up to `p_max_depth` levels deep.

[schema.sql]: schema.sql
