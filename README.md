# blog-api

REST API for a simple blog application with real-time comments.

Built with Node.js + Express.js as part of a technical evaluation for professional residencies.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Construction](#construction)
- [Environment Variables](#environment-variables)
- [Compilation](#compilation)
- [Execution](#execution)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Security](#security)
- [Project Structure](#project-structure)
- [Git History](#git-history)
- [AI Methodology](#ai-methodology)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express.js 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Authentication | JWT (HS256) + bcrypt + HttpOnly cookie |
| Validation | Zod 4 |
| Real-time | Socket.io 4 |
| Security | Helmet · CORS · express-rate-limit · cookie-parser |
| Logging | Morgan (HTTP) + structured `[AUTH]` audit trail |
| File upload | Multer 2 |
| Testing | Jest 30 + Supertest |
| Container | Docker + Docker Compose |

---

## Requirements

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) + Docker Compose (for the database)
- [Git](https://git-scm.com/)

> PostgreSQL does not need to be installed locally — it runs inside Docker.

---

## Construction

### 1. Clone the repository

```bash
git clone https://github.com/OrtegaGhost/blog-api.git
cd blog-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values. See [Environment Variables](#environment-variables) for details.

### 4. Start the database

```bash
docker compose up -d db
```

Wait for PostgreSQL to be ready:

```bash
docker compose exec db pg_isready -U bloguser -d blogdb
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development` · `test` · `production` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRATION` | No | `24h` | Token expiration time |
| `UPLOAD_DIR` | No | `uploads` | Directory for uploaded profile photos |
| `MAX_FILE_SIZE` | No | `5242880` | Max upload size in bytes (default 5 MB) |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated) |

**Example `.env`:**

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://bloguser:blogpassword@localhost:5432/blogdb?schema=public"
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=24h
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
CORS_ORIGIN=http://localhost:5173
```

---

## Compilation

Generate the Prisma client and apply database migrations:

```bash
# Generate Prisma client
npm run build

# Apply migrations to the database
npm run db:migrate
```

> `npm run build` must be run after every change to `prisma/schema.prisma`.

**Optional — seed the database with sample data:**

```bash
npm run db:seed
```

---

## Execution

### Local development (with hot reload)

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

### Production

```bash
npm start
```

### Docker (full stack)

Runs both the API and PostgreSQL in containers:

```bash
docker compose up -d
```

To apply migrations inside the container on first run:

```bash
docker compose exec api npx prisma migrate deploy
```

To stop all services:

```bash
docker compose down
```

To stop and remove all data:

```bash
docker compose down -v
```

---

## API Reference

All protected endpoints require authentication. The browser client uses an **HttpOnly cookie** (`access_token`) set automatically by `POST /login`. API clients (curl, Postman, test suites) may use the header instead:

```
Authorization: Bearer <access_token>
```

---

### `POST /register`

Registers a new user. Accepts `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Letters only, no numbers |
| `email` | string | Yes | Valid email format |
| `username` | string | Yes | Letters, numbers and `_` |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| `profilePhoto` | file | Yes | JPEG, PNG, GIF or WebP — max 5 MB |

**Responses:**

| Status | Condition |
|---|---|
| `201` | User created successfully |
| `400` | Missing fields, invalid data or missing file |
| `409` | Email or username already registered |

```json
// 201
{
  "message": "User registered successfully. Please log in.",
  "redirect": "/login"
}
```

---

### `POST /login`

Authenticates a user and returns a JWT.

```json
// Request body
{
  "username": "johndoe",
  "password": "Password1"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Valid credentials |
| `400` | Missing username or password |
| `401` | Wrong credentials |

On success the server also sets an `HttpOnly; SameSite=Lax` cookie named `access_token` (valid for 24 h). Browser clients are authenticated automatically on every subsequent request via this cookie.

```json
// 200
{
  "token_type": "Bearer",
  "expires_in": 86400,
  "expiration": 1749600000,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "profilePhoto": "/uploads/abc123.webp",
    "coverPhoto": null,
    "createdAt": "2026-06-04T00:00:00.000Z"
  }
}
```

---

### `GET /me`

Returns the authenticated user's profile.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Valid token |
| `400` | Missing `Authorization` header |
| `401` | Invalid or expired token |

```json
// 200
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "profilePhoto": "/uploads/abc123.jpg",
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

---

### `PUT /change-password`

Updates the authenticated user's password.

```json
// Request body
{
  "current_password": "OldPassword1",
  "new_password": "NewPassword1"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Password updated |
| `400` | Wrong current password or same as new |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

```json
// 200
{
  "message": "Password updated successfully"
}
```

---

### `POST /logout`

Clears the HttpOnly auth cookie. Idempotent — safe to call even with an expired token.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Cookie cleared |

```json
// 200
{ "message": "Logged out successfully" }
```

---

### `GET /forgot-password/:username`

Public endpoint — returns the security question key chosen at registration.

**Responses:**

| Status | Condition |
|---|---|
| `200` | User found |
| `404` | Username not found |

```json
// 200
{ "questionKey": "q0" }
```

Question keys map to: `q0` = first pet's name · `q1` = mother's maiden name · `q2` = childhood city · `q3` = favourite teacher · `q4` = favourite sports team.

---

### `POST /forgot-password`

Public endpoint — verifies the security answer and resets the password.

```json
// Request body
{
  "username": "johndoe",
  "securityAnswer": "Firulais",
  "newPassword": "NewPassword1!"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Password reset |
| `400` | Wrong security answer or weak new password |
| `404` | Username not found |

```json
// 200
{ "message": "Password reset successfully" }
```

---

### `GET /feed`

Returns root-level comments ordered by most recent first. Each comment includes its nested replies.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Valid token |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

```json
// 200
{
  "comments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "This is a comment",
      "createdAt": "2026-06-04T00:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "username": "johndoe",
        "name": "John Doe",
        "profilePhoto": "/uploads/abc123.webp"
      },
      "replies": [
        {
          "id": "reply-uuid",
          "content": "This is a reply",
          "parentId": "550e8400-e29b-41d4-a716-446655440000",
          "createdAt": "2026-06-04T00:01:00.000Z",
          "user": { "..." }
        }
      ]
    }
  ],
  "total": 1
}
```

---

### `POST /feed`

Creates a root comment or a reply. Broadcasts via Socket.io (`comment:new`).

```json
// Request body
{
  "content": "This is a new comment",
  "parentId": "optional-uuid-of-parent-comment"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Comment created |
| `400` | Empty or missing content |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

```json
// 200
{
  "message": "Comment created successfully",
  "comment": { "id": "...", "content": "...", "parentId": null, "..." }
}
```

---

### `PUT /feed/:id`

Edits the content of a comment. Only the author can edit their own comments.

```json
// Request body
{
  "content": "Updated content"
}
```

**Responses:**

| Status | Condition |
|---|---|
| `200` | Comment updated — emits `comment:updated` via Socket.io |
| `400` | Empty or missing content |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header or not the author |
| `404` | Comment not found |

---

### `DELETE /feed/:id`

Deletes a comment and all its replies (cascade). Only the author can delete their own comments.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Comment deleted — emits `comment:deleted` via Socket.io |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header or not the author |
| `404` | Comment not found |

---

### `GET /users/:username`

Returns the public profile and root-level comments of any user.

**Responses:**

| Status | Condition |
|---|---|
| `200` | User found |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |
| `404` | Username not found |

```json
// 200
{
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "username": "johndoe",
    "profilePhoto": "/uploads/abc123.webp",
    "coverPhoto": "/uploads/cover456.webp",
    "createdAt": "2026-06-04T00:00:00.000Z"
  },
  "comments": [ { "..." } ],
  "total": 3
}
```

---

### `PUT /me/photo`

Replaces the authenticated user's profile photo. Accepts `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `photo` | file | Yes | JPEG, PNG, GIF or WebP — max 5 MB |

The image is converted to WebP (400×400 cover-crop, quality 82) before saving.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Photo updated — returns full user profile |
| `400` | Missing file |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

---

### `PUT /me/cover`

Replaces the authenticated user's cover photo. Accepts `multipart/form-data`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `cover` | file | Yes | JPEG, PNG, GIF or WebP — max 5 MB |

**Responses:** same as `PUT /me/photo`.

---

### `PUT /me/name`

Updates the authenticated user's display name.

```json
// Request body
{
  "name": "Jane Doe"
}
```

| Constraint | Rule |
|---|---|
| Min length | 2 characters |
| Max length | 60 characters |
| Allowed chars | Letters, accented characters and spaces only |

**Responses:**

| Status | Condition |
|---|---|
| `200` | Name updated — returns full user profile |
| `400` | Invalid name (numbers, special chars, too short/long) |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

---

### `DELETE /me`

Permanently deletes the authenticated user's account. All their comments and replies are removed via cascade.

**Responses:**

| Status | Condition |
|---|---|
| `200` | Account deleted |
| `401` | Invalid or expired token |
| `403` | Missing `Authorization` header |

```json
// 200
{
  "message": "Account deleted successfully"
}
```

---

### Socket.io

Connect to `ws://localhost:3000` and listen for:

| Event | Payload | Description |
|---|---|---|
| `comment:new` | Comment object (with `parentId`) | Emitted when any user creates a comment or reply |
| `comment:updated` | `{ id, content, parentId, updatedAt, user }` | Emitted when the author edits a comment |
| `comment:deleted` | `{ id, parentId }` | Emitted when the author deletes a comment |

---

### `GET /health`

Returns server status. No authentication required.

```json
{ "status": "ok", "timestamp": "2026-06-04T00:00:00.000Z" }
```

---

## Running Tests

```bash
npm test
```

Runs **62 tests** across 3 suites covering all API scenarios:

**`auth.test.js` (41 tests)**
- `POST /login` — 200, 401, 400 (missing fields)
- `POST /register` — 201, 400 (invalid name/email/security question/missing fields)
- `GET /me` — 200, 400 (no header), 401 (invalid token)
- `PUT /change-password` — 200, 403, 401
- `PUT /me/photo` — 200, 400 (no file), 403, 401
- `PUT /me/cover` — 200, 400 (no file), 403, 401
- `PUT /me/name` — 200, 400 (invalid/short/missing), 403, 401
- `DELETE /me` — 200, 403, 401
- `GET /forgot-password/:username` — 200, 404
- `POST /forgot-password` — 200, 400 (wrong answer/weak password), 404

**`feed.test.js` (19 tests)**
- `GET /feed` — 200, 403, 401
- `POST /feed` — 200, 400 (empty content), 403, 401
- `PUT /feed/:id` — 200, 403 (non-owner), 404, 400 (empty content), 403 (no header), 401
- `DELETE /feed/:id` — 200, 403 (non-owner), 404, 403 (no header), 401

**`users.test.js` (4 tests)**
- `GET /users/:username` — 200, 404, 403, 401

**With coverage report:**

```bash
npm test -- --coverage
```

---

## Security

This API was designed following **OWASP TOP TEN 2025** and **OWASP ASVS Level 2**:

| Control | Implementation |
|---|---|
| Broken Access Control | JWT middleware on all protected routes; ownership check before edit/delete |
| Cryptographic Failures | bcrypt (12 rounds) · JWT HS256 · HttpOnly cookie (ASVS V8.2.2 — token not in JS-accessible storage) |
| Injection | Prisma ORM with parameterized queries (no raw SQL) |
| Insecure Design | Rate limiting: `/login` (30 req/15 min), `/register` (5 req/h), global (100 req/15 min) |
| Security Misconfiguration | Helmet + Permissions-Policy + Cache-Control: no-store + CORS allowlist + CORP on `/uploads` |
| Vulnerable Components | Snyk analysis — 0 known vulnerabilities |
| Auth Failures | Constant-time bcrypt comparison · security question recovery with hashed answers |
| Data Integrity | Zod validation on every request body |
| Logging & Monitoring | Morgan HTTP access log + structured `[AUTH]` audit events (LOGIN, LOGOUT, PASSWORD_CHANGED, ACCOUNT_DELETED) |

**Run Snyk analysis:**

```bash
npm run snyk:test
```

---

## Project Structure

```
blog-api/
├── prisma/
│   ├── migrations/          # Auto-generated migration files
│   ├── schema.prisma        # Database schema (User + Comment with parentId)
│   └── seed.js              # Optional seed data
├── src/
│   ├── config/
│   │   ├── db.js            # Prisma client singleton
│   │   └── env.js           # Environment variable validation (Zod)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── feed.controller.js   # getComments, createComment, updateComment, deleteComment
│   │   └── users.controller.js  # getUserProfile
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT factory (configurable missing-token status)
│   │   ├── error.middleware.js    # Global error handler
│   │   ├── upload.middleware.js   # Multer + sharp WebP conversion
│   │   └── validate.middleware.js # Zod request body validation
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── feed.routes.js         # GET / POST / PUT /:id / DELETE /:id
│   │   ├── users.routes.js        # GET /:username
│   │   └── index.js
│   ├── services/
│   │   ├── auth.service.js        # register, login, getProfile, changePassword, updateProfilePhoto, updateCoverPhoto, updateName, deleteAccount
│   │   ├── feed.service.js        # getComments, createComment, updateComment, deleteComment
│   │   └── users.service.js       # getUserProfile
│   ├── sockets/
│   │   └── index.js               # Socket.io singleton (init / getIO)
│   ├── utils/
│   │   ├── response.js            # sendSuccess / sendError helpers
│   │   └── validators.js          # Zod schemas: register, login, changePassword, comment, editComment, name
│   └── app.js                     # Express app (middleware + routes)
├── tests/
│   ├── setup.js             # Test environment variables
│   ├── auth.test.js         # Auth endpoint tests (41 tests)
│   ├── feed.test.js         # Feed endpoint tests — GET, POST, PUT /:id, DELETE /:id (19 tests)
│   └── users.test.js        # Users endpoint tests — GET /users/:username (4 tests)
├── uploads/                 # Profile photos (gitignored)
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── server.js                # HTTP server entry point + Socket.io init
```

---

## Git History

```
*   9815df4 (HEAD -> main) Merge develop into main
|\
| * 8f33d9b docs: update README — 62 tests, HttpOnly cookie auth, new endpoints, accurate security table
* |   46713c6 Merge develop into main
|\ \
| |/
| * be07f9c security: migrate JWT to HttpOnly cookie + expand test coverage to 62 tests
* |   d0e311f Merge develop into main
|\ \
| |/
| * b483afb security: add HTTP logging (Morgan) and auth event audit trail
* |   703eab1 Merge develop into main
|\ \
| |/
| * f89b6cc feat: add expires_in to login response (RFC 6749 §5.1) + update git log
* |   27f691b Merge develop into main
|\ \
| |/
| * cbd694a security: add Permissions-Policy header and Cache-Control no-store
* |   8858966 Merge develop into main
|\ \
| |/
| * 635e411 feat: password recovery via security questions
* |   989a65b Merge branch 'develop'
|\ \
| |/
| * d13e767 test: add coverage for PUT /me/photo, PUT /me/cover, PUT /me/name and DELETE /me
* |   a119844 Merge branch 'develop'
|\ \
| |/
| * c19e98d docs: update README with photo upload, name change and delete account endpoints
* |   b18048d Merge branch 'develop'
|\ \
| |/
| * f80aa94 feat: add PUT /me/name and DELETE /me endpoints
* |   e7eb477 Merge branch 'develop'
|\ \
| |/
| * 730ebb6 feat: add profile/cover photo upload endpoints and fix all tests
* |   a3d75a9 merge: develop → main (README update)
|\ \
| |/
| * a1e24fa docs: update README with threading, edit/delete and profile endpoints
* |   0e8ee27 merge: develop → main (threading, edit/delete, profile page)
|\ \
| |/
| * 1b4b680 feat: add comment threading, edit/delete endpoints and user profile
|/
* 8fd2064 feat: convert uploaded images to WebP with sharp
* 0db2605 fix: set Cross-Origin-Resource-Policy: cross-origin for /uploads
* db5ed54 test: add Jest + Supertest suite covering all API scenarios
* 839c185 feat: initial backend setup with full API implementation
```

```bash
# To view the full graph:
git log --oneline --graph --all
```

---

## AI Methodology

The use of AI was **not restricted** per the evaluation terms. The following methodology was applied:

### Human-Led, AI-Augmented Development (HLAD)

The developer acted as **tech lead and architect**. Claude Code (claude-sonnet-4-6) acted as an **accelerated executor**. No code was merged without human review and approval.

| Phase | Human role | AI role |
|---|---|---|
| Requirements analysis | Read and interpreted the spec | Identified edge cases and ambiguities |
| Architecture design | Approved all structural decisions | Proposed folder structure and patterns |
| Code generation | Reviewed every file before acceptance | Generated code following defined standards |
| Security hardening | Validated OWASP compliance | Implemented Helmet, rate limiting, Zod validation |
| Bug fixes | Identified CORP header blocking cross-origin images | Overrode Helmet's CORP header for `/uploads` route |
| Testing | Defined coverage requirements | Generated test cases per the spec scenarios |
| Documentation | Reviewed and approved this README | Generated initial draft |

### Tools used

| Tool | Model | Purpose |
|---|---|---|
| Claude Code | claude-sonnet-4-6 | Code generation, architecture, security, documentation |
| Claude Code | claude-haiku-4-5 | Quick lookups and clarifications |

### Guarantees

- Every line of generated code was understood and validated by the developer
- Commits are atomic and reflect conscious human decisions
- The AI did not decide architecture, acceptable vulnerabilities, or what goes to production
- Security controls were verified manually, not blindly generated
