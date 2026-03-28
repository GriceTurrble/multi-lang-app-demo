# ADR-0003: Using Named Params For Queries Whenever Possible

**Status:** Accepted
**Date:** 2026-03-27

## Context

Often with database queries written in code, we are working with variable,
especially user input, that we must pass the query in some way.
Simple string formatting (Python's `f"SELECT ... {arg}"`) is insufficient,
introducing SQL injection risks into the application.

It is preferred to used parameterized queries, supplying a placeholder
in the query string and the passing variable values to the database engine,
where those values can pass through a sanitization method before being injected safely
into the query context.

For example, in Python using `asyncpg`, you might write a query like so
(contrived example):

```py
import asyncpg

pool = asyncpg.create_pool(...)

async def query(post_id):
    async with pool.acquire() as conn:
        rows = conn.fetch("SELECT * FROM comments WHERE post_id = $1", post_id)
```

This pattern works will, up to a point. There are shortcomings with using this
kind of numbered placeholder system:

- The order of arguments passed to the method *must* match the numbered order
  of the placeholders used in the query. Any mismatch will cause the query
  to have unexpected results or fail completely.
- Adding new parameters to a query becomes a struggle for organizing code,
  as one must take care to arrange new parameters sensibly and update placeholders
  at the same time. These errors are difficult to catch with automated processes.
- Dynamic queries become much more complicated, requiring manipulation of the query string.

For some examples of this last point, consider the following scenarios.
First, if we want to conditionally filter a query based on an optional argument,
we may inject some extra `WHERE` conditions into the query like so:

```py
async def list_posts(page_size=25, post_id=None):
    post_filter = ""
    args = [page_size]
    if post_id:
        args.append(post_id)
        post_filter = "WHERE post.id = $2"
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT * FROM comments {post_filter} LIMIT $1",
            *args,
        )
    return rows
```

In another scenario, UPDATEs with a variable number of columns and values
(such as a PUT action that updates only some columns of an object)
require string joins, taking care to use proper SQL syntax in the result:

```py
async def update(post_id):
    updates = {"a": 1, "c": 2}
    # NOTE columns `b` and `d` may be present on this table,
    # but we only want to update the above values
    # (in reality we may have a model incoming

    # First we join the set of column names with a comma separater.
    # We must programatically create the numbered placeholders by manipulating the index
    # returned from `enumerate`:
    set_clauses = ", ".join(f"{key} = ${i + 2}" for i, key in enumerate(updates.keys()))
    # Further, we must *separately* get these values in the same order we parameterized them:
    values = list(updates.values())

    async with pool.acquire() as conn:
        conn.query(
            f"UPDATE posts SET {set_clauses} WHERE id = $1",
            post_id,
            *values
        )
```

These complex queries are difficult to build, debug, and update,
particularly if an individual who lacks sufficient knowledge of these requirements
tries to make a change.

## Decision

Where possible, used named parameters to pass variable information to a query.

In some database engine libraries, such as `sqlalchemy`,
queries may contain a placeholder with a useful name matching the value being parameterized:

```py
from sqlalchemy.sql import text
s = text("SELECT * FROM comments WHERE post_id = :post_id AND foo = :foo")
conn.execute(s, {"post_id", 123, "foo": 456}).fetchall()
```

Other engines, such as `asyncpg` (our preference in this project),
the above form is not available, and positional parameters are required.
However, a separate package, [`pgargs`], provides methods for collecting parameters
and outputting numbered placeholders automatically:

```py
from pgargs import Args, Cols
import asyncpg
pool = asyncpg.create_pool(...)

async def update(post_id):
    updates = {"a": 1, "c": 2}
    args = Args(post_id=post_id)
    set_cols = Cols(args, **updates)
    async with pool.acquire() as conn:
        conn.query(
            f"UPDATE posts SET {set_cols.assignments} WHERE id = {args.post_id}",
            *args,
        )
```

Refer to the [`pgargs`] documentation for details.

### Consideration: using a different library or an ORM

Building queries programmatically becomes easier using an ORM
(such as the [SQLAlchemy ORM]).
Named parameters are possible in such systems.

However, ORMs have a number of other issues that can be discussed separately,
thus we rely on raw SQL queries as much as possible.

## Consequences

### Pros

- Queries that use named parameters should be easier to read and understand.
- Adding new parameters, reordering them in a query, or removing them
  should be more straightforward and less prone to error.
- Queries built dynamically or conditionally should be easier to construct,
  without needing as much string manipulation or manual tracking of the
  order of numbered placeholders.
- Newcomers should be able to read the expected workflow and change
  or reuse it more easily.

### Cons

- For certain backends, using named parameters may require additional dependencies,
  such as the FastAPI backend's use of [`pgargs`].
- For `pgargs` in particular, contributors would need to learn the API
  of this package in order to use it effectively.
- The same patterns do not apply across different database engines,
  so each application would need to maintain its own flavor of a query
  particular to the database engine available in its environment.
- With `pgargs`, `$N` placeholder numbers are assigned based on the order
  arguments are first *accessed* in the SQL f-string, not the order they are
  added to `Args`. This means the positional order of values in `*args` is
  determined by SQL structure, not by the Python code that constructs the args.
  Test side effects and any code that unpacks `*args` positionally must account
  for this, and mismatches are not caught at query-construction time.

[`pgargs`]: https://github.com/raymondbutcher/pgargs
[sqlalchemy orm]: https://docs.sqlalchemy.org/en/20/orm/index.html
