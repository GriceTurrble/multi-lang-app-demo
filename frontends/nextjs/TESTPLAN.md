# Test Plan: Next.js Frontend

Testing framework: **Vitest + React Testing Library**

## Scope

Unit tests cover pure functions, the API client, React context, and all Client Components. Server Components (`app/layout.tsx`, `app/page.tsx`, `app/posts/page.tsx`, and any async page that fetches data server-side) are **out of scope** — Vitest does not support async Server Components. These would be covered by E2E tests (e.g. Playwright) in a future phase.

## File Layout

Mirror the source tree under `__tests__/`:

```
__tests__/
  lib/
    api/
      treeUtils.test.ts
      client.test.ts
    context/
      AuthProvider.test.tsx
  components/
    votes/
      VoteButtons.test.tsx
    posts/
      PostCard.test.tsx
      PostForm.test.tsx
      PostList.test.tsx
      PostDetail.test.tsx
      DeletePostButton.test.tsx
    comments/
      CommentForm.test.tsx
      CommentNode.test.tsx
      CommentTree.test.tsx
      LoadMoreReplies.test.tsx
    layout/
      Header.test.tsx
```

## Shared Test Utilities

Before writing individual test files, create `__tests__/utils.tsx` with:

- **`renderWithAuth(ui, authValue?)`** — renders any component inside a mock `AuthContext.Provider` with configurable user/token/initialized state, so tests don't spin up a real `AuthProvider` (which hits `localStorage` and `getMe` on mount).
- **Mock `next/navigation`** — `vi.mock('next/navigation')` at the top of any test file that renders a component using `useRouter` or `Link`. Provide a `mockRouter` object with jest-fn stubs for `push`, `replace`, etc.
- **Mock `next/form`** — `vi.mock('next/form', () => ({ default: ({ action, children, ...props }) => <form onSubmit={(e) => { e.preventDefault(); action(new FormData(e.currentTarget)); }} {...props}>{children}</form> }))` — maps `next/form`'s `Form` to a plain `<form>` so form submissions work in jsdom.

---

## 1. `lib/api/treeUtils.ts`

**File:** `__tests__/lib/api/treeUtils.test.ts`
**Deps:** none — pure function, no mocking needed.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Empty array | Returns `[]` |
| 2 | Single root comment (no parent) | Returns one root node with `replies: []` |
| 3 | Two root comments | Returns two root nodes in insertion order |
| 4 | One root with one direct reply | Root has `replies` array with the child node |
| 5 | Deep nesting (grandchild) | Root → child → grandchild nested correctly |
| 6 | Reply with unknown parent | Node is dropped from tree (no parent found in map) |
| 7 | Multiple replies to the same parent | All siblings present under the parent |
| 8 | Reply node has its own `replies: []` | Child nodes always carry a `replies` array |

This file has the highest return-on-investment: pure logic, zero mocking, covers the most critical data transformation in the app.

---

## 2. `lib/api/client.ts`

**File:** `__tests__/lib/api/client.test.ts`
**Deps:** Mock the global `fetch` with `vi.stubGlobal('fetch', vi.fn())` in `beforeEach`; restore in `afterEach`.

| # | Test | What to assert |
|---|------|----------------|
| 1 | `ApiError` stores `status` and `message` | `err.status === 404`, `err.message === "Not found"`, `err.name === "ApiError"` |
| 2 | Successful JSON response | `apiFetch` resolves with parsed JSON body |
| 3 | 204 No Content | Resolves with `undefined` without calling `res.json()` |
| 4 | Error response with `detail` string | Rejects with `ApiError`, message equals the `detail` string |
| 5 | Error response with `detail` object | Rejects with `ApiError`, message is `JSON.stringify(detail)` |
| 6 | Error response with no `detail` | Rejects with `ApiError`, message is `"HTTP <status>"` |
| 7 | Token provided | `Authorization: Bearer <token>` header sent |
| 8 | No token | `Authorization` header absent |
| 9 | `Content-Type: application/json` always set | Header present on every request |
| 10 | `options.headers` merged | Custom headers passed via `options` are included |
| 11 | Uses `NEXT_PUBLIC_API_BASE_URL` env var | Fetch URL starts with the configured base |

---

## 3. `lib/context/AuthProvider.tsx`

**File:** `__tests__/lib/context/AuthProvider.test.tsx`
**Deps:** Mock `lib/api/auth` (`getMe`, `logout`). `localStorage` is provided by jsdom — clear it in `beforeEach`. Mock `next/navigation`.

| # | Test | What to assert |
|---|------|----------------|
| 1 | No stored token → `initialized: true`, `user: null` | Context is initialized without a user |
| 2 | Stored token + `getMe` succeeds → sets `user` and `token` | Context exposes the user returned by `getMe` |
| 3 | Stored token + `getMe` fails → removes token from localStorage | Token is cleared; `initialized: true` |
| 4 | `login()` stores token in localStorage and exposes user | `localStorage.getItem('mlad_token')` equals the token |
| 5 | `logout()` calls `apiLogout`, clears user/token/localStorage | State is reset, storage is cleared |
| 6 | `logout()` with no token skips `apiLogout` call | `apiLogout` not called |
| 7 | `useRequireAuth` — initialized + no user → redirects to `/auth/login` | `router.replace` called with `/auth/login` |
| 8 | `useRequireAuth` — initialized + user present → no redirect | `router.replace` not called |
| 9 | `useRequireAuth` — not initialized yet → no redirect | Redirect deferred until initialization |

---

## 4. `components/votes/VoteButtons.tsx`

**File:** `__tests__/components/votes/VoteButtons.test.tsx`
**Deps:** No context or routing needed — `VoteButtons` is self-contained.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Renders current score | Score element shows the numeric value |
| 2 | Positive score prefixed with `+` | Displayed as `+5` |
| 3 | `userVote === 1` → upvote button has active styling | Upvote button has orange class |
| 4 | `userVote === -1` → downvote button has active styling | Downvote button has blue class |
| 5 | `userVote === 0` → neither button active | Neither button has active styling |
| 6 | Clicking upvote calls `onVote(1)` | Mock `onVote` received `1` |
| 7 | Clicking upvote when already upvoted calls `onVote(0)` (toggle off) | Receives `0` |
| 8 | Clicking downvote calls `onVote(-1)` | Mock `onVote` received `-1` |
| 9 | Optimistic update: score changes immediately before `onVote` resolves | Score updates before the promise resolves |
| 10 | Revert on failure: score returns to original if `onVote` rejects | Score restored after rejection |
| 11 | `disabled` prop → both buttons disabled | `aria-disabled` or `disabled` attribute set; `onVote` not called on click |
| 12 | `vertical` prop → flex-col layout class applied | Container has `flex-col` class |

---

## 5. `components/posts/PostCard.tsx`

**File:** `__tests__/components/posts/PostCard.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/navigation`, `lib/api/votes`.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Renders post title when present | Title text visible |
| 2 | No title → title element absent | `<h2>` not rendered |
| 3 | Body truncated at 120 chars | Shows `...` suffix when body is long |
| 4 | Short body shown in full | No truncation |
| 5 | Shows author and formatted date | Both visible in metadata row |
| 6 | Links to `/posts/<id>` | Anchor `href` is correct |
| 7 | No token → `VoteButtons` disabled | `disabled` prop passed through |
| 8 | With token → `VoteButtons` enabled | `disabled` is false |

---

## 6. `components/posts/PostForm.tsx`

**File:** `__tests__/components/posts/PostForm.test.tsx`
**Deps:** Mock `next/form` (see shared utilities). Mock `next/navigation` for the Cancel link.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Submit button disabled when body is empty | Button has `disabled` attribute |
| 2 | Submit button enabled once body has content | `disabled` removed after typing |
| 3 | `initialValues` pre-fills title and body fields | Input values match props |
| 4 | Submit calls `onSubmit` with trimmed title and body | Mock `onSubmit` receives correct values |
| 5 | Empty title omitted from submission (sent as `undefined`) | `onSubmit` called with `{ body: "..." }` |
| 6 | `onSubmit` rejection → error message shown | Error `<p>` appears |
| 7 | While submitting → button shows "Saving..." and is disabled | Loading state visible |
| 8 | Custom `submitLabel` prop | Button text matches prop |
| 9 | Cancel link points to `/posts` | `href="/posts"` |

---

## 7. `components/posts/DeletePostButton.tsx`

**File:** `__tests__/components/posts/DeletePostButton.test.tsx`
**Deps:** Mock `next/navigation`, mock `lib/api/posts` (`deletePost`).

| # | Test | What to assert |
|---|------|----------------|
| 1 | Initial state: shows "Delete" button | Confirm UI not visible |
| 2 | Clicking "Delete" enters confirm state | "Delete post?" prompt + Confirm/Cancel buttons appear |
| 3 | Clicking Cancel from confirm state resets to initial | Back to single Delete button |
| 4 | Confirming delete calls `deletePost` with postId and token | Mock received correct args |
| 5 | Successful delete → `router.push('/posts')` | Navigation called |
| 6 | Failed delete → error message shown, confirm UI reset | Error text visible |
| 7 | While deleting → Confirm button shows "Deleting..." and is disabled | Loading state |

---

## 8. `components/posts/PostDetail.tsx`

**File:** `__tests__/components/posts/PostDetail.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/navigation`, `lib/api/votes`.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Renders post title | Heading visible |
| 2 | No title → `<h1>` absent | Not rendered |
| 3 | Renders body | Body text visible |
| 4 | Shows author and formatted date | Metadata visible |
| 5 | `updated_at !== created_at` → "edited" label shown | Edit indicator visible |
| 6 | `updated_at === created_at` → no "edited" label | Not rendered |
| 7 | User is author → Edit link and Delete button shown | Author controls present |
| 8 | User is not author → no author controls | Edit/Delete absent |
| 9 | No token → `VoteButtons` disabled | Vote disabled |

---

## 9. `components/posts/PostList.tsx`

**File:** `__tests__/components/posts/PostList.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/navigation`, `lib/api/posts` (`listPosts`).

| # | Test | What to assert |
|---|------|----------------|
| 1 | Shows loading state initially | "Loading posts..." visible |
| 2 | Posts loaded → renders a `PostCard` per post | Correct number of cards |
| 3 | Empty list → "No posts yet" message | Empty state text |
| 4 | API error → error message shown | Red error text |
| 5 | `next_cursor` present → "Load more" button visible | Button rendered |
| 6 | No `next_cursor` → "Load more" button absent | Not rendered |
| 7 | Clicking "Load more" appends posts to list | Additional cards appear |
| 8 | While loading more → button shows "Loading..." and is disabled | Disabled state |
| 9 | Cancelled effect on unmount | No state-update errors after unmount |

---

## 10. `components/comments/CommentForm.tsx`

**File:** `__tests__/components/comments/CommentForm.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/form`, `next/navigation`, `lib/api/comments` (`createComment`).

| # | Test | What to assert |
|---|------|----------------|
| 1 | No token → shows "Log in to comment" prompt | Login link visible |
| 2 | With token → shows textarea and submit button | Form visible |
| 3 | No `parentCommentId` → placeholder is "Write a comment..." | Default placeholder |
| 4 | `parentCommentId` provided → placeholder is "Write a reply..." | Reply placeholder |
| 5 | Submit disabled when textarea empty | `disabled` attribute set |
| 6 | Submitting calls `createComment` with postId, body, token | Mock received correct args |
| 7 | `parentCommentId` included in API call when provided | `parent_comment_id` in request |
| 8 | Successful submit → calls `onCommentAdded` and clears textarea | Callback fired; field empty |
| 9 | API error → error message shown | Error text visible |
| 10 | `onCancel` prop provided → Cancel button shown | Button visible |
| 11 | Clicking Cancel → calls `onCancel` | Callback fired |

---

## 11. `components/comments/LoadMoreReplies.tsx`

**File:** `__tests__/components/comments/LoadMoreReplies.test.tsx`
**Deps:** Mock `lib/api/comments` (`listReplies`).

| # | Test | What to assert |
|---|------|----------------|
| 1 | Shows "Load more replies" button | Button text correct |
| 2 | Clicking button calls `listReplies` with correct args | Mock receives postId, commentId, cursor, token |
| 3 | Successful load → calls `onLoaded` with items and `next_cursor` | Callback receives API response |
| 4 | While loading → button shows "Loading..." and is disabled | Loading state |
| 5 | API error → error message shown | Error text visible |

---

## 12. `components/comments/CommentNode.tsx`

**File:** `__tests__/components/comments/CommentNode.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/form`, `next/navigation`, `lib/api/comments`, `lib/api/votes`. Mock `window.confirm`.

This is the most complex component. Focus on state transitions; recursive rendering can be tested shallowly by verifying one level of replies renders.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Renders author, date, and body | Content visible |
| 2 | `updated_at !== created_at` → "edited" label shown | Indicator present |
| 3 | User is author → Edit and Delete buttons shown | Author controls visible |
| 4 | User is not author → no Edit/Delete | Author controls absent |
| 5 | Clicking Reply toggles the reply form | `CommentForm` appears/disappears |
| 6 | Clicking Edit shows inline textarea pre-filled with body | Edit form appears |
| 7 | Saving edit calls `updateComment` and hides form | API called; textarea gone |
| 8 | Cancelling edit restores original body | Draft discarded |
| 9 | Delete — `window.confirm` rejected → delete not called | `deleteComment` not invoked |
| 10 | Delete — confirmed → calls `deleteComment`; renders `[deleted]` | Deleted state shown |
| 11 | Delete failure → error not propagated visibly (try/catch swallowed) | Component does not crash |
| 12 | Replies from props rendered recursively | Child nodes visible |
| 13 | `replyCursor` present → `LoadMoreReplies` rendered | Component mounted |
| 14 | After reply added via `handleReplyAdded` → new reply appears | New child node visible |

---

## 13. `components/comments/CommentTree.tsx`

**File:** `__tests__/components/comments/CommentTree.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/form`, `next/navigation`, `lib/api/comments` (`listComments`).

| # | Test | What to assert |
|---|------|----------------|
| 1 | Shows loading state initially | "Loading comments..." visible |
| 2 | Renders root-level comment nodes after load | Comment authors/bodies visible |
| 3 | Empty list → "No comments yet" message | Empty state text |
| 4 | API error → error message shown | Error text visible |
| 5 | `next_cursor` present → "Load more comments" button | Button visible |
| 6 | Clicking load more appends new root nodes | Additional nodes appear |
| 7 | New top-level comment added via `CommentForm` → appears in list | Added to roots |

---

## 14. `components/layout/Header.tsx`

**File:** `__tests__/components/layout/Header.test.tsx`
**Deps:** `renderWithAuth`. Mock `next/navigation`.

| # | Test | What to assert |
|---|------|----------------|
| 1 | Not initialized → skeleton placeholder shown | Login/Register links absent; pulse div present |
| 2 | Initialized, no user → Login and Register links shown | Both links visible with correct hrefs |
| 3 | Initialized with user → username and Logout button shown | Auth links absent |
| 4 | Clicking Logout calls `logout()` then `router.push('/')` | Both called in order |
| 5 | "MLAD Forum" link points to `/posts` | `href="/posts"` |

---

## Priority Order

Implement in this order for maximum early coverage with minimal setup overhead:

1. `treeUtils` — pure logic, no mocking, fastest to write
2. `client` — critical utility, only needs `fetch` mock
3. Shared test utilities (`__tests__/utils.tsx`)
4. `VoteButtons` — self-contained, tests optimistic update pattern
5. `PostForm`, `CommentForm` — form logic, reusable mock patterns
6. `Header`, `PostCard`, `PostDetail` — context-dependent renders
7. `DeletePostButton`, `LoadMoreReplies` — focused interaction tests
8. `AuthProvider` — context internals; useful once component patterns are established
9. `PostList`, `CommentTree` — data-fetching containers, most complex to set up
10. `CommentNode` — most complex component; do last
