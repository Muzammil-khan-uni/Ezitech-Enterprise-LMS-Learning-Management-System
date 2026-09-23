# Ezitech LMS — Client (Phase 0 Scaffold)

React + TypeScript frontend for the Ezitech Enterprise Learning Management System.

## Status: Phase 0 — foundation only
No real pages yet — just a booting router shell and the state-management
split that every later feature will follow.

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

App runs at `http://localhost:5173`. Expects the API server (Phase 0
scaffold) running at `http://localhost:5000`.

## Architecture

```
src/
├── app/          Redux store (client/session state) + React Query client (server state)
├── routes/       route shell — role-based layouts added per phase
├── layouts/       per-role layout shells (student/instructor/mentor/admin) — added per phase
├── lib/          axios instance (token-refresh interceptors wired in Phase 1)
├── components/   shared UI components — added as needed
└── main.tsx      entry point
```

## State management rule

- **Redux Toolkit** → client/session/UI state only (auth session, current
  role, UI toggles, socket connection status).
- **React Query** → all server data (courses, progress, submissions,
  notifications). Never duplicate server data into Redux.

## Routing (target structure, filled in per phase)

```
/login, /register, /verify-certificate/:code   -> public
/student/*     -> guarded, role=student
/instructor/*  -> guarded, role=instructor
/mentor/*      -> guarded, role=mentor
/admin/*       -> guarded, role=admin
```

See the project's development plan for the full phase breakdown.
