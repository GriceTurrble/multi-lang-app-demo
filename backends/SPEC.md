# Specification for backend service

A barebones Reddit-like application that stores Posts and Comments.
Comments may relate to a Post or to another Comment.

## One directory per backend

- Each sub-directory from here contains a STANDALONE backend application that does not interact with the other backends in any way.
- Each backend should be following the SAME specification from this document.
- Each backend should be interchangeable with any other at any time.

## Data spec

Refer to the [Data specification](DATA_SPEC.md) for details.

## Requirements

Each backend service must fulfill the following criteria:

- Runs from a Docker container
- Exposes an external port `8080`
- Communicates with a single, shared Postgres instance as a data storage layer.
- Serves an API only, no HTML documents or fragments.
- Runs a REST API serving Post and Comment resources with CRUD operations using GET, POST, PUT, and DELETE verbs.
- OpenAPI/Swagger documentation of the api is served at the endpoint `/docs`

## REST resources

- A list of Posts can be served with pagination controls (up to 25 posts per page) at endpoint `/posts`
- A single Post resource can be retrieved from `/posts/<post_id>`.
- The term "top Comment" refers to any Comment with no `parent_comment_id`, therefore it is a comment made directly to a Post, not replying to another Comment.
- Top Comments for a single Post are retrieved from `/posts/<post_id>/comments` with pagination controls (up to 10 comments per page).
- Each top comment returned from `/posts/<post_id>/comments` should also include its "replies", which are other Comments that have `parent_comment_id` matching that top comment.
- A single Comment can be retrieved from `/posts/<post_id>/comments/<comment_id>`.
- When retrieving a single Comment, the `post_id` and `comment_id` from the URL must both match the `post_id` and `id` columns, respectively, of the target Comment; otherwise, a 404 error should be raised.
- When retrieiving a single Comment from `/posts/<post_id>/comments/<comment_id>`, 2 levels of "replies" to that Comment are returned with it: the direct replies to the single Comment, and replies to those replies.
