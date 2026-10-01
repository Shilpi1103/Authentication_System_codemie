# Backend Tests

Integration tests (Jest + Supertest) for the OTP-based login feature and a regression suite for
the existing password-based auth endpoints.

## Requirements

These tests require a reachable MongoDB instance. Set `MONGO_URI` (e.g. via a `.env.test` file
loaded by your shell, or export it directly) to point at a **dedicated test database** — never
the development or production database, since tests create and delete documents.

```bash
export MONGO_URI="mongodb://localhost:27017/mern-jwt-auth-test"
```

## Running

```bash
npm test
```
