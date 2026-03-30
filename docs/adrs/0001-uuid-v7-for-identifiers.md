# ADR-0001: UUID v7 for Identifiers

**Status:** Accepted
**Date:** 2026-03-18

## Context

All primary resources in the database (users, sessions, posts, comments) require unique identifiers.
The options considered were:

- **Sequential integers** - simple, but expose row counts and create contention under concurrent inserts.
- **UUID v4** - random, globally unique, but non-ordered; causes index fragmentation in Postgres B-tree indexes and makes keyset/cursor pagination less natural.
- **[UUID v7]** - time-ordered, globally unique, and fits natively in Postgres's `UUID` type with no extension overhead beyond generation.

## Decision

Use UUID v7 for all primary key columns. Values are generated as column defaults inside the database via the `uuidv7()` function, provided by the [pg_uuidv7] Postgres extension.

## Consequences

- IDs sort chronologically, which aligns naturally with the keyset/cursor pagination used across the API.
- No application-layer ID generation is required; the database is the single source of truth for new IDs.
- All backends and frontends must treat IDs as opaque strings - no logic should depend on their internal structure.
- The `pg_uuidv7` extension must be available in the Postgres instance. It is included in the project's database setup.

[uuid v7]: https://uuidv7.com
[pg_uuidv7]: https://github.com/fboulnois/pg_uuidv7
