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
| Authentication | JWT (HS256) + bcrypt |
| Validation | Zod 4 |
| Real-time | Socket.io 4 |
| Security | Helmet · CORS · express-rate-limit |
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

All protected endpoints require the header:

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

```json
// 200
{
  "token_type": "Bearer",
  "expiration": 1749600000,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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

### `GET /feed`

Returns all comments ordered by most recent first.

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
        "profilePhoto": "/uploads/abc123.jpg"
      }
    }
  ],
  "total": 1
}
```

---

### `POST /feed`

Creates a new comment. Broadcasts it in real time via Socket.io (`comment:new` event).

```json
// Request body
{
  "content": "This is a new comment"
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
  "comment": { ... }
}
```

---

### Socket.io

Connect to `ws://localhost:3000` and listen for:

| Event | Payload | Description |
|---|---|---|
| `comment:new` | Comment object | Emitted when any user creates a comment |

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

Runs 23 tests covering all API scenarios defined in the evaluation spec:

- `/login` — 200, 401, 400 (no username, no password, no data)
- `/register` — 201, 400 (numbers in name, invalid email, missing data)
- `/me` — 200, 400 (no header), 401 (invalid token)
- `/change-password` — 200, 403 (no header), 401 (invalid token)
- `GET /feed` — 200, 403 (no header), 401 (invalid token)
- `POST /feed` — 200, 400 (empty content), 403 (no header), 401 (invalid token)

**With coverage report:**

```bash
npm test -- --coverage
```

---

## Security

This API was designed following **OWASP TOP TEN 2025** and **OWASP ASVS Level 2**:

| Control | Implementation |
|---|---|
| Broken Access Control | JWT middleware on all protected routes |
| Cryptographic Failures | bcrypt (12 rounds) + JWT HS256 with 32+ char secret |
| Injection | Prisma ORM with parameterized queries (no raw SQL) |
| Insecure Design | Rate limiting on `/login` (10 req/15 min) and `/register` (5 req/h) |
| Security Misconfiguration | Helmet HTTP headers + CORS allowlist |
| Vulnerable Components | Snyk analysis — 0 known vulnerabilities |
| Auth Failures | Constant-time password comparison to prevent timing attacks |
| Data Integrity | Zod validation on every request body |
| Logging | No passwords or tokens logged |

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
│   ├── schema.prisma        # Database schema (User + Comment models)
│   └── seed.js              # Optional seed data
├── src/
│   ├── config/
│   │   ├── db.js            # Prisma client singleton
│   │   └── env.js           # Environment variable validation (Zod)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── feed.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js     # JWT factory (configurable missing-token status)
│   │   ├── error.middleware.js    # Global error handler
│   │   ├── upload.middleware.js   # Multer configuration
│   │   └── validate.middleware.js # Zod request body validation
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── feed.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── auth.service.js  # register, login, getProfile, changePassword
│   │   └── feed.service.js  # getComments, createComment + Socket.io emit
│   ├── sockets/
│   │   └── index.js         # Socket.io singleton (init / getIO)
│   ├── utils/
│   │   ├── response.js      # sendSuccess / sendError helpers
│   │   └── validators.js    # Zod schemas for all endpoints
│   └── app.js               # Express app (middleware + routes)
├── tests/
│   ├── setup.js             # Test environment variables
│   ├── auth.test.js         # Auth endpoint tests
│   └── feed.test.js         # Feed endpoint tests
├── uploads/                 # Profile photos (gitignored)
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── server.js                # HTTP server entry point + Socket.io init
```

---

## Git History

```
* 128bc5f (HEAD -> develop, origin/main, origin/develop, main) fix: switch Prisma generator to prisma-client-js for CJS compatibility
* 3f5c5f1 docs: add comprehensive README with API reference and setup instructions
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
