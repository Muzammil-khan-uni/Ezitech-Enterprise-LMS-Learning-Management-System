# Testing

## Running the suite

```
npm install
npm test
```

`npm test` runs `jest --runInBand` (sequential, not parallel - see
`jest.config.js` for why). First run will be slower than subsequent
ones: `mongodb-memory-server` downloads a real `mongod` binary and
caches it.

No other setup is required - no real MongoDB, no real Redis, no real
SMTP server. See "How this avoids needing real infrastructure" below.

## What's covered

- **`test/auth.test.js`** - registration, login (including the
  identical-error-for-wrong-password-vs-no-such-user behavior),
  deactivated-account rejection, the full forgot/reset-password flow,
  email verification (including token single-use), MFA setup +
  TOTP-gated login + recovery-code login (including single-use).
- **`test/rbac.courses.test.js`** - the Phase A course-content-gating
  fix: anonymous/non-enrolled viewers get a stripped lesson list and a
  403 on the single-lesson content endpoint; enrolled students get full
  content; preview lessons are visible without enrollment; draft
  courses 404 (not 403) for everyone except their owner/admin;
  `?status=draft` can't be used to enumerate unpublished courses.
- **`test/rbac.assessments.test.js`** - the Phase A assessment-ownership
  fix: an instructor cannot edit, delete, list submissions for, or grade
  another instructor's assessment; a grade above the assessment's own
  maximum is rejected; a non-enrolled student cannot start an attempt.
- **`test/rbac.discussions.test.js`** - the Phase B discussion-gating
  fix: a non-enrolled user can't read or post; an enrolled student can
  post and get an instructor reply (flagged `isInstructorReply`); a
  student can't post an announcement even when enrolled; an unrelated
  instructor is blocked from another instructor's board while admin
  isn't.
- **`test/rbac.learningPaths.test.js`** - the Phase C learning-path
  gating fix: a draft roadmap 404s for anonymous/student callers and is
  visible to its manager; the list endpoint can't be tricked into
  returning drafts via a query override; only course_manager/admin can
  create a path.
- **`test/studentJourney.test.js`** - the full critical path end to end:
  instructor builds a course (section, video lesson, project
  assessment) → publishes it → student enrolls → completes the lesson
  (100%, since it's the only lesson) → enrollment flips to `completed`
  → certificate is issued and publicly verifiable by its code → student
  submits the assessment → instructor grades it → student sees the
  graded result via their own submissions endpoint. A second test
  confirms the documented "no default certificate template configured"
  case degrades to no certificate rather than crashing progress
  tracking.
- **`test/cascadeDelete.test.js`** - the Phase C cascade-delete fix:
  deleting a course removes every course-scoped record (sections,
  lessons, assessments, submissions, enrollments, progress, discussion
  threads and their comments), while a previously-issued certificate is
  deliberately preserved and still verifies correctly even though its
  course no longer exists.

- **`test/openApiDocs.test.js`** - confirms the OpenAPI spec (`openapi.yaml`)
  and its Swagger UI docs page (`/api/v1/docs`) are actually served and
  reachable, and spot-checks that a handful of this session's endpoints
  appear in the served spec.
- **`test/enrollment.test.js`** - coupon application at enrollment
  (percentage discount, course-scoped rejection, expiry, redemption
  limit - including that the counter actually increments and a second
  student is correctly blocked once it's exhausted), prerequisite
  enforcement (blocked until the prerequisite course is completed, then
  allowed), and drop/re-enrollment (reactivates the same Enrollment
  document rather than erroring or duplicating; enrolling twice without
  dropping is a 409).
- **`test/reports.test.js`** - report access control (student blocked,
  unknown type rejected), all three export formats (CSV header
  content, Excel/PDF content-type), and the `courseId`/`instructorId`/
  `dateFrom` filters added earlier this session - verified by parsing
  the actual returned CSV rows and asserting the row count narrows
  correctly, not just that the request returns 200.
- **`test/scormSecurity.test.js`** - directly exercises the Phase A
  SCORM token fix by replicating its HMAC-signing algorithm in the
  test (the signing function itself isn't exported - it's normally
  only reached via package upload, which needs a real Cloudinary
  connection this environment doesn't have). Confirms: the OLD
  unsigned base64 format no longer works, a tampered payload is
  rejected, a token signed with the wrong secret is rejected, a
  *correctly*-signed token pointing at a disallowed host (the SSRF
  target - cloud metadata endpoints) is still rejected by the
  hostname allowlist as defense in depth, `http://` is rejected in
  favor of `https://` only, and a malformed token 400s rather than
  500ing. Also confirms the package route is still deliberately
  reachable without auth - a 401 there would mean the no-auth design
  had regressed.
- **`test/subscriptions.test.js`** - subscribe/cancel lifecycle,
  re-subscribing to the same plan before expiry extending from the
  *current* expiry rather than restarting from now (verified by
  checking the gap between two expiry timestamps is ~30 days, not
  ~0), and course-coverage logic integrated with real enrollment
  pricing: an "all courses" plan makes a paid course free to enroll
  in, a plan scoped to specific courses doesn't cover a course outside
  that list (full price still charged), and a free course needs no
  subscription at all.
- **`test/learningPathProgression.test.js`** - path enrollment
  actually enrolls in the FIRST course only, not the whole path at
  once (confirmed by checking the second course is absent from the
  student's enrollments); double-enrolling in the same path is a 409;
  `getPathProgress`'s numbers are checked at three points (before
  enrolling: not started, 0%; after enrolling but before completing:
  0% with the first course as "next"; after completing the first
  course: 50%, `completedCount`/`totalCount` correct, second course
  now "next") rather than only checking the final state, so a
  regression in any one stage's math would be caught rather than only
  the end-to-end total; completing the first course produces a "Next
  course unlocked" notification; and a path the student has started
  appears in `/learning-paths/mine`.

## What is deliberately NOT covered yet

This is a foundation, not full coverage. Notably absent:

- The discussion thread pin/lock/delete lifecycle beyond the RBAC
  checks in `rbac.discussions.test.js`, plus analytics aggregation
  correctness generally (`checkPathAdvancement`'s notification-firing
  is now covered by `learningPathProgression.test.js`, but the
  broader analytics dashboards' aggregation math is not).
- SCORM package upload and RTE data get/commit (the token-security
  boundary itself is now covered in `scormSecurity.test.js` - what's
  still missing is the manifest-parsing/upload flow, which needs a
  real Cloudinary connection this environment doesn't have) and live
  classes/offline packages entirely.
- The client (React/TypeScript side) - this is a server-only test
  suite. `useSessionBootstrap`, the download helper, the report filter
  UI, and the MFA/recovery-code screens added this session are all
  unverified beyond manual code review.
- Socket.IO / real-time notifications - the tests only exercise the
  HTTP app (`src/app.js`), never `src/server.js`'s `start()`, so
  sockets are never initialized in this suite.

## A note on verification

**This suite has not been run.** The development environment used to
write it has no installed `node_modules` and no network access to
install them, so nothing here has executed against a real Jest
process. Every test file passed `node --check` (syntax only), and every
HTTP call, request-body shape, and expected response shape in these
tests was cross-referenced by hand against the actual route,
controller, service, and Joi validation-schema files it exercises. That
is a meaningfully weaker guarantee than "the suite is green" - **run
`npm install && npm test` before trusting any of this**, and expect to
fix a handful of small mismatches (a status code off by one, a response
field name) rather than a fundamentally broken approach.

One bug was already found this way without the suite even running:
writing the MFA-login test required tracing exactly what
`err.mfaRequired = true` in `auth.service.js` actually produced in the
HTTP response, which turned up that `middlewares/error.middleware.js`
never forwarded that flag into the JSON body at all - so the client's
"show the MFA prompt" branch could never have fired, on either the
original codebase or the rewritten `login()` from this session. Fixed
alongside the tests; see `remediation-status.md`.

## How this avoids needing real infrastructure

- **MongoDB**: `mongodb-memory-server` starts a real, disposable
  `mongod` process per test run (`test/setup/globalSetup.js` /
  `globalTeardown.js`). This is real MongoDB, not a fake - the closest
  thing to testing against production without a shared database.
- **Redis**: mocked. `__mocks__/ioredis.js` swaps in `ioredis-mock` for
  every `require('ioredis')` in the app (Jest applies this
  automatically because it lives at `<rootDir>/__mocks__/`). Good
  enough for the app's actual Redis usage (basic cache get/set, rate
  limiting), not a guarantee of real Redis semantics under load or
  clustering.
- **Job queues (BullMQ/email)**: mocked. `__mocks__/bullmq.js` replaces
  `Queue`/`Worker` with an in-memory recorder - `enqueueEmail(...)`
  records the job instead of sending real mail. `test/helpers/mailbox.js`
  reads that recording, which is how the auth tests pull a real
  verification/reset token out of a "sent" email without an SMTP
  server.
- **Rate limiting**: `middlewares/rateLimiter.js` is a no-op under
  `NODE_ENV=test` (set in `globalSetup.js`). A real test suite makes
  far more requests to `/auth/login` etc. from one source than the
  limiter allows within its window - that's a property of running many
  tests quickly, not the credential-stuffing pattern the limiter exists
  to catch. Every other environment is unaffected by this change.

## Adding to this suite

- New model/route work should get at least one test in the relevant
  RBAC-style file, or a new file following the same `test/rbac.*.test.js`
  naming if it's a new module.
- Use `test/helpers/factories.js` (`createUser`, `createCategory`,
  `createDefaultCertificateTemplate`, `authHeader`) rather than
  hand-rolling user/token setup in each test file.
- Prefer driving through the real HTTP routes via `supertest` (as every
  file here does) over calling service functions directly - that's what
  actually exercises the validation middleware, the RBAC middleware,
  and the route wiring, which is where several of this session's real
  bugs were found.
