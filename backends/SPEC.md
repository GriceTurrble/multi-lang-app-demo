# Specification for backend service

A barebones Reddit-like application that stores Posts and Comments.
Comments may relate to a Post or to another Comment.

## One directory per backend

- Each sub-directory from here contains a STANDALONE backend application that does not interact with the other backends in any way.
- Each backend should be following the SAME specification from this document.
- Each backend should be interchangeable with any other at any time.

## Data spec

Refer to the [Data specification] for details.

## Requirements

Each backend service must fulfill the following criteria:

- Runs from a Docker container
- Exposes an external port `8080`
- Communicates with a single, shared Postgres instance as a data storage layer.
- Serves an API only, no HTML documents or fragments.
- Runs a REST API serving Post and Comment resources with CRUD operations using GET, POST, PUT, and DELETE verbs.
- OpenAPI/Swagger documentation of the api is served at the endpoint `/docs`

## Terminology

- Posts may have Comment replies, and Comments may have other Comment replies, as well. This creates a comment tree beneath a given Post.
- "Top Comment" refers to any Comment with no `parent_comment_id`, therefore it is a comment made directly to a Post, not replying to another Comment.
- "Replies" are any Comment that has some other comment as its `parent_comment_id`. A Top Comment should not be referred to as a "reply" in most cases.

## REST resources
### Posts and Comments
- `/posts`
    - GET: A list of Posts served with pagination controls (up to 25 posts per page)
    - POST: create a new Post
- `/posts/<post_id>`
    - GET: a single post matching `post_id`
    - PATCH: update the details of a single Post matching `post_id`.
    - DELETE: delete this Post and all comments related to it.
- `/posts/<post_id>/comments`
    - GET: a list of Top Comments served with pagination controls (up to 10 Top Comments per page).
        - A `max_depth` parameter can be passed to set the number of levels of replies that should be returned in the comment tree in one request. Defaults to `2`. Pass `0` to get top comments only.
        - A `replies_per_page` parameter controls how many direct replies to the same comment should be returned.
        - Given the above constraints, the maximum number of comments returned in any one request should be
          `(max_depth + 1) * replies_per_page`
    - POST: create a new top-level Comment for the Post.
- `/posts/<post_id>/comments/<comment_id>`
    - GET: a single comment matching `comment_id` (the `post_id` should also match, else return a 404 error)
    - PATCH: update the details of this comment.
    - DELETE: delete this Comment and all comment replies to it.
- `/posts/<post_id>/comments/<comment_id>/replies`
    - GET: a list of comment replies under comment matching `comment_id` (the `post_id` should also match, else return a 404 error).
        - A `max_depth` parameter can be passed to set the number of levels of replies that should be returned in the comment tree in one request. Defaults to `2`. Pass `0` to get direct replies only to this comment only.
        - A `replies_per_page` parameter controls how many direct replies to the same comment should be returned.
        - Given the above constraints, the maximum number of comments returned in any one request should be
          `(max_depth + 1) * replies_per_page`

### Votes

To vote, whether up or down, on a Post or Comment,
send a POST request to the `/vote` endpoint after that resource

- For Posts: `/posts/<post_id>/vote`
- For Comments: `/posts/<post_id>/comments/<comment_id>/vote`

The following parameters are required:

- `username` string
- `value` of the vote, either `1`, `0`, or `-1` (return a 400 error if the value is missing or incorrect)

The `object_id` of the given resource will be assigned, either the `post_id` for a Post
or the `comment_id` for a Comment.

Finally, the `object_type` of the resource will be mapped based on the resource used:
`"Post"` for a Post, and `"Comment"` for a Comment.

#### Scenarios

When a vote is cast, one of these scenarios may occur:

- **A vote `value` of `0` is passed**:
  This is equivalent to deleting this user's vote on the given object.
  If any row exists in the `votes` table with the same `username` that is passed
  and on the same `object_id`/`object_type` combination,
  delete that row.
- **A vote does not already exist for this user on this resource**:
  INSERT a new row into the `votes` table.
- **A vote already exists for this user on this resource**:
  UPDATE the existing vote, potentially overwriting the existing `value`.

[Data specification]: ../database_schema/SPEC.md
