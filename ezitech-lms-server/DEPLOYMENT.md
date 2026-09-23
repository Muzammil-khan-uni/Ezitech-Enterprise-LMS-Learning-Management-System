# Deployment Readiness Checklist

## First-time setup (do this before anything else)

Public sign-up (`/auth/register`) only ever creates **student** accounts.
Instructor, mentor, course_manager and admin accounts are provisioned by an
existing admin via the "Invite user" screen. On a brand
new deployment with zero users, that's a chicken-and-egg problem: there's no
admin yet to invite the first one. Run this once, right after the database is
up, to break that loop:

```
SEED_ADMIN_NAME="Jane Admin" SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD="a-strong-password" npm run seed:admin
```

Safe to re-run - if a user with that email already exists, it exits without
making any change. After this, log in as that admin and use the Users screen
to invite every instructor, mentor, course_manager and further admin.

Status of the production-hardening items from the Phase 8 plan, and what's
still an operator/infra decision rather than application code.

## Done in this codebase

- **Crash safety** (Phase 0): every controller wrapped in `catchAsync`,
  centralized error middleware, `unhandledRejection`/`uncaughtException`
  trigger a graceful shutdown rather than a crash, MongoDB connects with
  retry, graceful shutdown drains in-flight requests and closes
  DB/Redis/worker connections before exiting.
- **Rate limiting is multi-instance-safe**: both the global and
  auth-specific limiters are backed by Redis (`rate-limit-redis`), not
  in-process memory - the limit is real however many API instances are
  running behind a load balancer.
- **Socket.IO is multi-instance-safe**: the `@socket.io/redis-adapter` is
  wired in, so a notification room (`user:<id>`) broadcasts across every
  instance, not just the one a given socket happened to connect to. Falls
  back to in-memory (single-instance) if Redis is unreachable at startup,
  logged as a warning rather than failing to boot.
- **Caching**: the public course catalog (the hottest anonymous read) is
  cache-aside via Redis with a 60s TTL, invalidated on every course
  create/update/delete/status change. Fails open (hits the DB) on any
  cache error - a Redis outage degrades performance, never correctness.
- **Background jobs** (BullMQ, Redis-backed): outgoing email is queued,
  not sent inline in the request - a slow/flaky SMTP provider never
  blocks an HTTP response. A repeatable hourly job scans for assessments
  due within 24h and notifies (in-app + email) enrolled students who
  haven't submitted, filling the "Assignment Deadlines" notification type
  that a plain event trigger couldn't cover.
- **Email** (Nodemailer): real SMTP in production via env vars; falls
  back to an Ethereal test account in development so the whole flow is
  exercisable without real credentials.
- **API documentation**: a hand-authored OpenAPI 3.0 spec
  (`openapi.yaml`, ~100 paths across every mounted module) is served at
  `GET /api/v1/openapi.yaml`, with a Swagger UI browsing page at
  `GET /api/v1/docs`. Both are public, the same as most public APIs'
  docs - each documented endpoint still enforces its own auth/RBAC
  independently, so exposing the spec itself isn't a new attack
  surface. See the spec's own `info.description` for what it does and
  doesn't guarantee (it hasn't been validated against a live server,
  only checked for internal consistency).

- **Docker**: non-root user in the server image, multi-stage build on
  Node 22 with `npm ci`, `.dockerignore` on both repos, container health
  checks on both images.

## Deploying with docker-compose

`docker-compose.yml`, `.env`, `.env.example` and `setup-env.sh` live in the parent
folder, next to `ezitech-lms-server/` and `ezitech-lms-client/`. Run every compose
command from that parent folder.

```
./setup-env.sh          # creates .env with random secrets (or: cp .env.example .env and fill by hand)
# Then edit .env: CLIENT_ORIGIN, SERVER_PUBLIC_URL, SMTP_*, CLOUDINARY_*, SEED_ADMIN_*.
# Required: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, MONGO_ROOT_USER,
# MONGO_ROOT_PASSWORD, REDIS_PASSWORD, CLIENT_ORIGIN, SMTP_*, CLOUDINARY_*.
docker compose up -d --build
```

`docker compose` refuses to start if `MONGO_ROOT_USER`,
`MONGO_ROOT_PASSWORD` or `REDIS_PASSWORD` is missing, and the API refuses
to start in production with weak JWT secrets.

This starts four services: `mongo` and `redis` (both password-protected,
reachable only on the internal compose network), `api`, and `client`
(nginx, serving the built React app and reverse-proxying `/api` and
`/socket.io` to `api` - see `ezitech-lms-client/nginx.conf`). Once
`mongo` and `redis` report healthy and `api` passes its healthcheck,
visit the client and run the seed-admin step above against the running
`api` container:

```
docker compose exec api sh -c \
  'SEED_ADMIN_NAME="Jane Admin" SEED_ADMIN_EMAIL=admin@example.com \
   SEED_ADMIN_PASSWORD="a-strong-password" npm run seed:admin'
```

### Public URLs and HTTPS

`CLIENT_ORIGIN` is the address users type in the browser and must be
`https://...` in production (the refresh-token cookie is `Secure` and
`SameSite=Strict`, and email links are built from it). `SERVER_PUBLIC_URL`
defaults to `CLIENT_ORIGIN`, which is correct with the bundled nginx because
the API is served from the same origin under `/api`. TLS itself is
terminated by whatever sits in front of the `client` container (a load
balancer, Caddy, Cloudflare, ...). The API logs a warning at startup if
either URL is not `https://` in production.

### Real client IPs and rate limiting

Rate limiting and session records key on the client IP. Behind nginx the
API must be told how many proxies to trust, otherwise every user appears
to come from the nginx container and shares one rate-limit bucket.
`TRUST_PROXY` controls this: it defaults to `1` in production (the bundled
nginx). Set it to `2` if a load balancer or CDN also sits in front of
nginx, or to `false` if the API is exposed directly. Only the number of
hops you actually run should be trusted, or clients can spoof their IP.

If Redis becomes unavailable, general API traffic keeps working (rate
limiting is skipped) but the authentication endpoints refuse requests
until Redis returns, so login attempts are never unthrottled.

### Health checks

- `GET /health` - liveness (process is up). Used by the Docker healthcheck.
- `GET /health/ready` - readiness: `200` only when MongoDB and Redis are
  both reachable, otherwise `503`. Point a load balancer or orchestrator
  readiness probe here.

### Uploads

nginx allows request bodies up to 250 MB and streams them to the API
(the API's own limits are 200 MB for video, 100 MB for SCORM packages).
Any additional proxy or CDN in front must allow the same size and a
timeout of at least five minutes.

### Secrets hygiene

Never commit or ship `.env` files; the repository ignores them. If a
`.env` has ever been shared or archived, treat every value in it as
compromised and rotate it (database password, JWT secrets, SMTP and
Cloudinary credentials). Rotating the JWT secrets signs every user out.

## Roles and what each one can reach

Access is decided per course, not just per role:

| Role | What they can do |
|---|---|
| student | Their own enrollments, progress, submissions and certificates; the content, discussion board, assessments and live classes of courses they are enrolled in |
| instructor | Everything about courses they own: content, assessments and grading, students, announcements, moderation, live classes. Nothing in other instructors' courses, even when enrolled there as a learner (then they are treated as a student) |
| mentor | Only courses an admin or course manager assigned to them: read the content, see the students, reply in the discussion board, join live classes, view attendance and grade submissions. Cannot edit content or moderate |
| course_manager | All courses, categories, learning paths, coupons and reports; assigns mentors to courses |
| admin | Everything, plus users, invitations, plans and certificate templates |

Mentors are assigned on the course builder page (admins and course managers see
a "Manage mentors" button; the course's instructor sees the list read-only). A
mentor with no assignments sees an empty workspace. Existing mentor accounts
therefore lose access to every course until they are assigned.

## Payments are switched on (no gateway required)

Paid courses, coupons, subscriptions and revenue reporting are on by default, whether or
not a payment gateway is integrated:

- Instructors can create, price and publish paid courses. Students can enroll in them,
  directly or as the first course of a learning path, and coupons and subscriptions
  apply as usual.
- Plans and coupons are managed from the admin screens, and the public `/plans` page
  lists the plans. Prices, coupon fields and revenue figures are shown everywhere
  (`GET /config` returns `paymentsEnabled: true`).
- **No money is collected.** Enrolling or subscribing activates access immediately and
  records the price as if it had been paid. Revenue and instructor earnings are computed
  from those recorded prices. Integrate a gateway (checkout, webhook-confirmed payment
  records, refunds) before charging real customers.
- To switch every paid feature off again, start the server with `PAYMENTS_ENABLED=false`.
  Paid enrollment, subscriptions and coupons then answer `402` and the client hides them.
- `npm run payments:clear-mock` (a dry run that only counts) and
  `npm run payments:clear-mock -- --apply` zero recorded prices and delete subscription
  records. Only use it if you want to discard figures that were never charged.

## Progress, completion and certificates

- A **video lesson** completes once 85% of its length has been watched. The
  server credits playback at up to about 2.25x real time, so jumping ahead
  earns nothing and a course cannot be finished faster than its content. The
  duration stored on the lesson is used; the browser's value is ignored, so
  every video lesson needs an accurate `durationSeconds`.
- A **SCORM lesson** completes only from inside its player. A lesson linked to
  a published **assessment** stays locked until that assessment is passed.
- The course percentage counts lessons plus published assessments. Quizzes are
  passed at the assessment's pass mark; manually graded work at its pass mark,
  or 50% if none is set. A course completes, and its certificate is issued,
  only at 100%.
- Adding a published assessment to a course later lowers existing students'
  percentage on their next activity, but never revokes a completion or a
  certificate already granted.
- A course with **paying students cannot be deleted**; archive it instead.
  Deleting any other course removes everything tied to it. Certificates keep
  the course title and student name, so they stay verifiable and downloadable.
  Certificates issued before this change have no stored title, so their title
  disappears if the course is later deleted; a backfill is not included.
- Stored files (videos, PDFs, SCORM packages, thumbnails) are deleted from
  Cloudinary when a lesson or course is deleted, on a best-effort basis:
  failures are logged and do not block the deletion.

## Account protection

- **Lockout:** 5 failed sign-in attempts (wrong password or wrong second factor)
  inside 15 minutes lock the account for 15 minutes, even for the correct
  password, and the owner gets an email. Tune with `LOGIN_MAX_ATTEMPTS`,
  `LOGIN_FAILURE_WINDOW_MINUTES` and `LOGIN_LOCK_MINUTES`. An admin can clear a
  lock from the Users screen ("Unlock"). Password changes and email changes also
  count wrong attempts. The per-IP limiter still applies on top of this.
- **Two-factor secrets** are encrypted in the database with `MFA_ENCRYPTION_KEY`
  (required in production, 32+ random characters, kept apart from the JWT
  secrets). Existing plaintext secrets keep working and are encrypted the next
  time their owner signs in. **If the key is lost or changed, every enrolled
  user's authenticator stops working** - back it up like the database password.
  Turning MFA off, or regenerating recovery codes, needs the password plus a
  current code; an authenticator code can only be used once.
- **Sessions:** resetting or changing a password signs the account out of every
  other device. Refresh tokens rotate on every use, and reuse of an old token
  after a 10 second grace period revokes the whole session.
- **Cross-origin refresh:** `/auth/refresh` and `/auth/logout` reject requests
  whose `Origin` is not `CLIENT_ORIGIN`, so `CLIENT_ORIGIN` must exactly match
  the address users open in the browser.

## SCORM content origin

SCORM packages are third-party HTML and JavaScript. They must never be served
from the same origin as the app or the API, otherwise a malicious package could
act as whoever opens it. The API therefore serves packages **only** on the host
named in `SCORM_CONTENT_ORIGIN` and answers 404 for them on any other host.

1. Choose a hostname such as `scorm.example.com` (a different registrable domain
   is safest; a sibling subdomain is acceptable).
2. Point DNS and a TLS certificate for it at the same nginx that serves the app.
   The bundled `nginx.conf` already contains a server block for any hostname
   starting with `scorm.` that forwards only the SCORM player and package paths
   to the API.
3. Set `SCORM_CONTENT_ORIGIN=https://scorm.example.com` in the API `.env`.

Without it, SCORM lessons cannot be started (the launch endpoint answers 503 with
a clear message); everything else keeps working. In development the value
defaults to `http://127.0.0.1:<PORT>`, which the browser treats as different from
`http://localhost:5173`. Learners never receive the permanent package address;
they get a launch link that expires after 8 hours.

## Verification status

- `npm run lint` (server) and `tsc --noEmit` plus the Vite build (client)
  pass.
- `npm run test:noDb` runs checks that need no database: proxy setting
  parsing, health endpoints, and malformed/oversized request handling.
- The full Jest suite (`npm test`) needs a MongoDB binary or server and
  has **not** been run against this revision. Run it before deploying.
- The nginx configuration was exercised against a running API, including
  large uploads, per-client rate limiting and the SCORM host isolation; the
  compose file was only validated as YAML and against the folder layout, not
  run under Docker.
- The Jest suite (`npm test`) was run against a MongoDB-compatible server
  (FerretDB), not real MongoDB. Two report tests that use `$cond` in an
  aggregation cannot pass on FerretDB and need a real MongoDB run. FerretDB
  also cannot prove that simultaneous conditional updates are atomic, so the
  "two buyers, one coupon redemption left" race is covered only by a
  sequential test; confirm it on real MongoDB.
- Not covered by automated tests: the Socket.IO changes (account re-check every
  5 minutes, signalling limited to peers in the same room) and the React SCORM
  player. The generated player page itself was exercised in jsdom.

## Still an operator/infra decision, not application code

- **TLS termination** - typically a load balancer/reverse proxy's job
  (e.g. an ALB, Nginx, or Cloudflare in front of the container), not
  something the Node process should handle directly.
- **Real SMTP credentials** and a sending domain with SPF/DKIM configured
  - `.env.example` documents the variables; an operator supplies real
    values.
- **Worker deployment topology** - the BullMQ workers currently start in
  the same process as the API for simplicity at this project's scale.
  Splitting them into a separate worker container/deployment (so a worker
  crash or a burst of email jobs can't affect API request latency) is a
  deployment change, not a code change - `jobs/email.job.js` and
  `jobs/deadline-reminder.job.js` already export their `start*Worker`
  functions independently for exactly this reason.
- **Secrets management** - JWT secrets, DB credentials, and SMTP
  credentials should come from a secrets manager (not committed `.env`
  files) in any real deployment.
- **Load testing** - no live database/Redis is available in this
  development sandbox to run a genuine load test against. A starting
  point:
  ```
  npx autocannon -c 50 -d 30 -p 10 http://localhost:5000/api/v1/courses
  ```
  Run this against a real staging deployment (with realistic seed data)
  before going live, and watch DB connection pool saturation and Redis
  latency under load, not just request throughput.
- **Horizontal scaling readiness** - the app is now safe to run as
  multiple instances (rate limiting and sockets both Redis-backed), but
  actually provisioning multiple instances, a load balancer, and MongoDB
  replica set / Redis persistence strategy is infrastructure work outside
  this codebase.
- **Monitoring/alerting** - Winston logs to console + file today; wiring
  those into a real log aggregator (e.g. CloudWatch, Datadog) and setting
  up alerts on error rate / queue backlog is an operational setup step.
- **Frontend bundle size** - the Phase 7 build produced a single JS chunk
  over Vite's 500kb warning threshold. Route-level code splitting
  (`React.lazy` per role-layout route) would fix this but wasn't done
  here to keep the codebase's route wiring simple to read; worth doing
  before a real production launch.

## Day-to-day operations

```
docker compose ps                       # status and health
docker compose logs -f api              # API logs (JSON, console only in production)
docker compose up -d --build            # deploy a new version
docker compose down                     # stop (data volumes are kept)

# Backup MongoDB
docker compose exec -T mongo sh -c 'mongodump -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip' > backup-$(date +%F).archive.gz

# Restore
docker compose exec -T mongo sh -c 'mongorestore -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop' < backup-YYYY-MM-DD.archive.gz
```

`docker compose down -v` deletes the database and Redis volumes - never run it on production.
