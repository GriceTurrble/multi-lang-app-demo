# Specification for backend service

A barebones Reddit-like application that stores Posts and Comments.
Comments may relate to a Post or to another Comment.

## One directory per backend

- Each sub-directory from here contains a STANDALONE backend application that does not interact with the other backends in any way.
- Each backend should be following the SAME specification from this document.
- Each backend should be interchangeable with any other at any time.

## Data spec

Refer to the [Data specification](../database/SPEC.md) for details.

## Authentication

Backends must implement session-based Bearer token authentication.

### Password storage

User passwords must be stored as a secure hash (e.g. Argon2, bcrypt, or PBKDF2). Plaintext passwords must never be stored.

### Sessions

On login, a session record is created in the `sessions` table with:

- A unique token (a [UUID v7])
- A reference to the authenticated user
- An expiration timestamp (default: 30 days)
- An `is_active` flag

The token is returned to the client as the `access_token` in the login response.

### Bearer token validation

Protected endpoints extract the token from the `Authorization: Bearer <token>` header and validate it by checking the `sessions` table for a row that:

- Matches the provided token
- Has `is_active = TRUE`
- Has `expires_at > NOW()`

If validation fails, respond with `401 Unauthorized`.

### Auth endpoints

- `POST /auth/register` — Create a new user account
  - Body: `email`, `username`, `password`
  - Response: user object (`id`, `email`, `username`, `created_at`)
  - Reject duplicate `email` or `username` with `409 Conflict`
- `POST /auth/login` — Authenticate and receive a session token
  - Body: `email`, `password`
  - Response: `access_token`, `token_type: "bearer"`, user object
  - Reject invalid credentials with `401 Unauthorized`
- `POST /auth/logout` — Invalidate the current session (requires auth)
  - Sets `is_active = FALSE` on the session row
  - Response: `204 No Content`
- `GET /auth/me` — Return the currently authenticated user (requires auth)
  - Response: user object

### Protected endpoints

The following endpoints require a valid Bearer token. The authenticated user is determined from the session; `username` must **not** be accepted as a body or query parameter for identifying the acting user.

- `POST /posts` — author is the authenticated user
- `PATCH /posts/<post_id>` — requires auth
- `DELETE /posts/<post_id>` — requires auth
- `POST /posts/<post_id>/comments` — author is the authenticated user
- `PATCH /posts/<post_id>/comments/<comment_id>` — requires auth
- `DELETE /posts/<post_id>/comments/<comment_id>` — requires auth
- `POST /posts/<post_id>/vote` — vote is attributed to the authenticated user
- `POST /posts/<post_id>/comments/<comment_id>/vote` — vote is attributed to the authenticated user

### Ownership

Authentication alone is not authorization. Editing and deleting are restricted to the
author of the resource: only the author of a Post may PATCH or DELETE that Post, and
only the author of a Comment may PATCH or DELETE that Comment.

Backends must compare the resource's `author_id` against the user resolved from the
session, and must not rely on a frontend to hide the controls.

A request from an authenticated user who is not the author is rejected with
`403 Forbidden`.

When the resource does not exist at all, PATCH responds `404 Not Found`, while DELETE
stays idempotent and responds `204 No Content`.

Voting is deliberately not restricted this way. Any authenticated user may vote on any
Post or Comment, including their own.

## Requirements

Each backend service must fulfill the following criteria:

- Runs from a Docker container
- Exposes an external port `8080`
- Communicates with a single, shared Postgres instance as a data storage layer.
- Serves an API only, no HTML documents or fragments.
- Runs a REST API serving Post and Comment resources with CRUD operations using GET, POST, PATCH, and DELETE verbs. Updates are partial, so PATCH is used rather than PUT.
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
  - POST: create a new Comment on the Post.
    - Body: `body`, and an optional `parent_comment_id`.
    - Omitting `parent_comment_id` creates a Top Comment. Passing one creates a reply to that comment.
    - The `parent_comment_id`, when given, must name a Comment on this same Post. A parent belonging to a different Post is rejected with a 404 error. A foreign key alone does not enforce this, so backends must check it explicitly; without the check a reply can be attached across Posts, producing a Comment that neither tree query will ever return.
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

#### Bounding the comment tree

Both `max_depth` and `replies_per_page` feed a recursive query, so left unchecked a
single request can ask for an arbitrarily large tree. Backends must enforce an upper
bound on each and reject an out-of-range value with `422 Unprocessable Content`.

The exact ceilings are left to each implementation, but they must exist.

### Votes

To vote, whether up or down, on a Post or Comment,
send a POST request to the `/vote` endpoint after that resource.
This endpoint requires authentication; the vote is attributed to the authenticated user.

- For Posts: `/posts/<post_id>/vote`
- For Comments: `/posts/<post_id>/comments/<comment_id>/vote`

The following body parameter is required:

- `value` of the vote, either `1`, `0`, or `-1`

The `object_id` of the given resource will be assigned, either the `post_id` for a Post
or the `comment_id` for a Comment.

Finally, the `object_type` of the resource will be mapped based on the resource used:
`"Post"` for a Post, and `"Comment"` for a Comment.

#### Scenarios

When a vote is cast, one of these scenarios may occur:

- **A vote `value` of `0` is passed**:
  This is equivalent to deleting this user's vote on the given object.
  If any row exists in the `votes` table for the authenticated user
  and on the same `object_id`/`object_type` combination,
  delete that row.
- **A vote does not already exist for this user on this resource**:
  INSERT a new row into the `votes` table.
- **A vote already exists for this user on this resource**:
  UPDATE the existing vote, potentially overwriting the existing `value`.

[uuid v7]: https://uuidv7.com
