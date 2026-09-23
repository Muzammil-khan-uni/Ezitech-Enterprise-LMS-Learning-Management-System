# Ezitech LMS — API Server (Phase 0 Scaffold)

Node.js/Express backend for the Ezitech Enterprise Learning Management System.

## Status: Phase 0 — foundation only
No business features yet. This phase establishes the parts that must never
change once features are built on top: error handling, logging, DB/Redis
connections, and graceful shutdown.

## Getting started

```bash
cp .env.example .env      # fill in real values
npm install
npm run dev                # nodemon, requires local Mongo + Redis
```

Or with Docker (spins up Mongo + Redis alongside the API):

```bash
docker compose up --build
```

Health check: `GET /health`
API root: `GET /api/v1`

## Architecture

```
src/
├── config/       env, MongoDB connection, Redis client
├── middlewares/  centralized error handler, 404 handler
├── utils/        ApiError, ApiResponse, catchAsync, logger
├── modules/      feature modules (auth, courses, ...) — added per phase
├── app.js        Express app assembly
└── server.js     HTTP server bootstrap + graceful shutdown
```

## Crash-safety design

- Every async controller is wrapped in `catchAsync` — a rejected promise
  always reaches the centralized error middleware, never the process.
- `process.on('unhandledRejection' | 'uncaughtException')` triggers a
  **graceful** shutdown (finish in-flight requests, close connections,
  exit) rather than an abrupt crash, so a process manager can restart
  cleanly.
- MongoDB connection retries on startup instead of failing on the first
  transient error (useful when the DB container is still starting).

See the project's development plan for the full phase breakdown.
