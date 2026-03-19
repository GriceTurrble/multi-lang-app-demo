# ADR-0002: Password Hashing Scheme

**Status:** Accepted
**Date:** 2026-03-18

## Context

User passwords must never be stored in plaintext. A key derivation function (KDF) must be applied before storage so that a database breach does not directly expose credentials.

The options considered were:

- **MD5 / SHA-family** — cryptographic hash functions, not KDFs; no work factor, trivially brute-forced.
- **bcrypt** — well-established, widely supported, memory-stable work factor; limited to 72-byte passwords.
- **PBKDF2** — NIST-recommended, FIPS-compliant; computationally bound but not memory-hard.
- **Argon2** — winner of the 2015 Password Hashing Competition; memory-hard, resistant to GPU and ASIC attacks, and configurable across time, memory, and parallelism dimensions.

## Decision

Use **Argon2** as the primary hashing scheme, via [passlib]'s `CryptContext`. bcrypt and PBKDF2 are registered as deprecated fallback schemes with `deprecated="auto"`, allowing transparent re-hashing of any legacy hashes to Argon2 on the user's next successful login.

## Consequences

- Argon2 provides stronger resistance to offline brute-force attacks than bcrypt or PBKDF2, at the cost of higher memory usage per verification.
- The `deprecated="auto"` setting means no explicit migration step is needed; legacy hashes are upgraded opportunistically.
- Backends in other languages must also use Argon2 as the primary scheme and must produce hashes compatible with passlib's format, or accept that hashes are not portable across backend implementations.
- Argon2 work-factor parameters (time cost, memory cost, parallelism) use passlib's defaults and should be reviewed and tuned if this application moves beyond demo use.

[passlib]: https://passlib.readthedocs.io
