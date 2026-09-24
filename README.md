<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:0c4a6e,100:0ea5e9&amp;height=220&amp;section=header&amp;text=Ezitech%20Enterprise%20LMS&amp;fontSize=38&amp;fontColor=ffffff&amp;animation=fadeIn&amp;fontAlignY=38&amp;desc=A%20Full-Scale%2C%20Multi-Role%20Learning%20Management%20System&amp;descAlignY=58&amp;descSize=16" width="100%"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&amp;weight=600&amp;size=23&amp;duration=2800&amp;pause=900&amp;color=0EA5E9&amp;center=true&amp;vCenter=true&amp;width=700&amp;lines=Courses+%2B+Live+Classes+%2B+SCORM+%2B+Assessments;MFA+Auth+%2B+RBAC+%2B+Redis-Backed+Everything;Certificates+%2B+Subscriptions+%2B+Coupons+%2B+Reports;React+19+%2B+Node+26+%2B+MongoDB+%2B+Socket.IO" alt="Typing SVG" />

<br/><br/>

[![Backend](https://img.shields.io/badge/Backend-Express_5_%2B_Node_26-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React_19_%2B_TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Database](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](#)
[![Cache/Queue](https://img.shields.io/badge/Cache_%2F_Queue-Redis_%2B_BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](#)
[![Deploy](https://img.shields.io/badge/Deploy-Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#)
[![API Docs](https://img.shields.io/badge/API_Docs-OpenAPI_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](#)

[![i18n](https://img.shields.io/badge/i18n-English_%2F_Urdu-0ea5e9?style=flat-square)](#)
[![MFA](https://img.shields.io/badge/Auth-JWT_%2B_TOTP_MFA-blueviolet?style=flat-square)](#)
[![Real-time](https://img.shields.io/badge/Real--time-Socket.IO_Redis_Adapter-black?style=flat-square&logo=socketdotio&logoColor=white)](#)
[![Testing](https://img.shields.io/badge/Tests-Jest_%2B_mongodb--memory--server-brightgreen?style=flat-square)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#-contributing)

</div>

<br/>

## 📖 Table of Contents

<details open>
<summary>Click to expand</summary>

- [✨ Overview](#-overview)
- [🚀 Features](#-features)
- [🎭 Roles &amp; Who Does What](#-roles--who-does-what)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚡ Getting Started](#-getting-started)
- [🔐 Environment Configuration](#-environment-configuration)
- [🔌 API Reference](#-api-reference)
- [🛡️ Security &amp; Production-Hardening](#️-security--production-hardening)
- [🧪 Testing](#-testing)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📬 Contact](#-contact)
- [📄 License](#-license)

</details>

---

## ✨ Overview

> **Ezitech Enterprise LMS** is a full learning-management platform — not a single-course demo, but the kind of system a training company, university, or corporate L&amp;D department would actually run: course authoring with sections and lessons, live classes, SCORM package playback, quizzes and assignments with grading, discussion boards, certificates, subscriptions, coupons, and multi-role dashboards — all sitting on a **Node 26 + Express 5 + MongoDB + Redis** backend with a **React 19 + TypeScript** frontend.

It's built with the boring, unglamorous parts of a real product taken seriously: Redis-backed rate limiting and caching that stays correct across multiple API instances, a Socket.IO Redis adapter so notifications reach every instance, BullMQ background jobs so a slow SMTP server never blocks a request, and a hand-authored OpenAPI 3.0 spec (~100 documented paths) instead of stale prose docs.

<div align="center">

| 🎯 Goal | 💡 Approach |
|---|---|
| Real multi-role LMS | Student, Instructor, Mentor, Course Manager, and Admin each get purpose-built dashboards |
| Crash-safe by design | Every controller wrapped in `catchAsync`, graceful shutdown, MongoDB retry-on-connect |
| Horizontally scalable | Redis-backed rate limiting, caching, and Socket.IO — correct behind a load balancer, not just on one instance |
| Documented, not assumed | An OpenAPI 3.0 spec hand-written against the real source, served live at `/api/v1/docs` |
| Verified RBAC | Dedicated test suites for course-content gating, assessment ownership, and discussion-board access |

</div>

---

## 🚀 Features

<table>
<tr>
<td width="50%" valign="top">

### 📚 Course Delivery
- 🗂️ **Course builder**: sections, lessons, drip content, preview lessons
- 🎬 Video lessons + **SCORM package** upload &amp; playback (own content origin for security)
- 📺 **Live classes** with a real-time classroom (Socket.IO)
- 🛤️ **Learning paths** — curated multi-course sequences
- ⭐ Course **reviews &amp; ratings**, category management

</td>
<td width="50%" valign="top">

### 📝 Assessment &amp; Progress
- ❓ **Quiz builder** with a question builder UI
- 📄 **Assignment submissions** with instructor **grading**
- ⏰ Automated **deadline reminders** (in-app + email, hourly scan job)
- 📊 Per-lesson **progress tracking** &amp; learning statistics
- 🎓 **Certificate generation** (PDF, QR-verifiable) from custom templates

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💬 Engagement
- 💬 **Discussion boards** per course, with instructor-reply flagging
- 🔔 Real-time **notification bell** over WebSockets
- 🌐 **i18n**: English &amp; Urdu out of the box
- 🌗 **Dark mode** + Framer Motion page transitions

</td>
<td width="50%" valign="top">

### 💰 Monetization &amp; Admin
- 💳 **Subscriptions &amp; plans**, **coupons**, instructor commission tracking
- 📈 **Analytics &amp; reports** (Excel export via `exceljs`)
- 👥 Full **user management** — admin-provisioned Instructor/Mentor/Course Manager accounts
- 🧾 Attendance tracking for live sessions

</td>
</tr>
</table>

---

## 🎭 Roles &amp; Who Does What

<div align="center">

| Role | What they can do |
|:--|:--|
| 🎓 **Student** | Enroll, learn, take quizzes/assignments, join live classes, earn certificates |
| 👨‍🏫 **Instructor** | Build &amp; manage their own courses, grade submissions, moderate discussions, run live classes |
| 🧑‍🏫 **Mentor** | Guide assigned students, view mentor-scoped course &amp; progress dashboards |
| 🗂️ **Course Manager** | Curate categories, learning paths, and course catalog-level operations |
| 👑 **Admin** | Full platform control — user provisioning, coupons, subscriptions, reports, certificate templates |

</div>

> 🔐 Public sign-up only ever creates **Student** accounts. Every other role is provisioned by an existing Admin via the "Invite user" screen — deliberately, so elevated roles can't self-register.

---

## 🏗️ Architecture

```
┌──────────────────────────┐        REST + WebSocket        ┌──────────────────────────┐
│   React 19 + TypeScript    │ ◄─────────────────────────────► │   Express 5 (Node 26)      │
│   Redux Toolkit + React     │    axios → /api/v1/*             │   19 domain modules          │
│   Query + Framer Motion     │    socket.io-client → /            │                              │
└──────────────────────────┘                                 └───────────┬──────────────────┘
                                                                          │
                    ┌─────────────────────────┬─────────────────────────┼───────────────────────┐
                    ▼                          ▼                          ▼                        ▼
          ┌──────────────────┐      ┌──────────────────┐     ┌──────────────────────┐  ┌──────────────────────┐
          │    MongoDB          │      │    Redis             │     │    BullMQ Workers        │  │    Cloudinary            │
          │  (Mongoose ODM)      │      │  rate limiting,      │     │  emails, deadline         │  │  videos, PDFs, SCORM,     │
          │                       │      │  caching, Socket.IO   │     │  reminder scans           │  │  images                   │
          │                       │      │  adapter               │     │                            │  │                            │
          └──────────────────┘      └──────────────────┘     └──────────────────────┘  └──────────────────────┘
```

Every request-handling controller is wrapped in `catchAsync` so a rejected promise always reaches the centralized error middleware rather than crashing the process; `unhandledRejection`/`uncaughtException` trigger a **graceful shutdown** — draining in-flight requests and closing DB/Redis/worker connections — instead of an abrupt exit.

---

## 🛠️ Tech Stack

<div align="center">

<img src="https://skillicons.dev/icons?i=react,ts,redux,vite,tailwindcss,nodejs,express,mongodb,redis,docker,git,github" />

</div>

<div align="center">

**Backend**

| Category | Technology |
|:--|:--|
| Runtime &amp; Framework | **Node.js 26** + **Express 5** |
| Database | **MongoDB** via **Mongoose** |
| Caching, Rate-Limiting &amp; Jobs | **Redis** (`ioredis`) + **BullMQ** + `rate-limit-redis` |
| Real-time | **Socket.IO** + `@socket.io/redis-adapter` (multi-instance safe) |
| Auth | **JWT** (access + refresh) + **bcryptjs** + **Speakeasy** (TOTP MFA) |
| Validation | **Joi** schemas on every mutating endpoint |
| File Storage | **Cloudinary** (video, PDF, SCORM, images) |
| Documents &amp; Exports | **pdfkit** (certificates), **exceljs** (report exports), **qrcode** (certificate verification), **archiver** / **adm-zip** (SCORM packaging) |
| Email | **Nodemailer** (real SMTP in prod, Ethereal in dev) |
| Security | **Helmet**, **cors**, custom Mongo-sanitize &amp; trusted-origin middleware |
| Logging | **Winston** + **Morgan** |
| Testing | **Jest** + **Supertest** + **mongodb-memory-server** + **ioredis-mock** |

**Frontend**

| Category | Technology |
|:--|:--|
| UI Library | **React 19** + **TypeScript** |
| Build Tool | **Vite** |
| State | **Redux Toolkit** + **TanStack React Query** |
| Routing | **React Router 7** with `ProtectedRoute` |
| Styling | **Tailwind CSS 4** |
| Animation | **Framer Motion** |
| i18n | **i18next** / **react-i18next** (English + Urdu) |
| Charts | **Recharts** |
| Real-time | **socket.io-client** |
| Icons | **lucide-react** |

**Infrastructure**

| Category | Technology |
|:--|:--|
| Containerization | **Docker Compose** — MongoDB, Redis, API, and an Nginx-served frontend, wired together with one `.env` |

</div>

---

## 📁 Project Structure

```
ezitech-lms-deploy-ready/
│
├── ezitech-lms-server/
│   ├── src/
│   │   ├── app.js / server.js       # Express app assembly + HTTP bootstrap + graceful shutdown
│   │   ├── config/                  # env, db, redis, cloudinary, mailer
│   │   ├── middlewares/             # auth, rbac, rateLimiter, mongoSanitize, trustedOrigin, upload, validate
│   │   ├── models/                  # 20+ Mongoose models (Course, Assessment, Certificate, Enrollment...)
│   │   ├── modules/                 # 19 feature modules (routes + controller + service per domain)
│   │   ├── sockets/                 # Socket.IO server + live-class event handlers
│   │   ├── jobs/                    # BullMQ queues, email job, deadline-reminder job
│   │   └── scripts/                 # seedAdmin.js, clearMockPayments.js
│   ├── openapi.yaml                 # Hand-authored OpenAPI 3.0 spec (~100 paths), served at /api/v1/docs
│   ├── DEPLOYMENT.md                # Production readiness checklist
│   ├── TESTING.md                   # Test suite guide
│   └── Dockerfile
│
├── ezitech-lms-client/
│   ├── src/
│   │   ├── features/                # auth, courses, assessments, live-classes, scorm, certificates,
│   │   │                             #   subscriptions, coupons, discussions, reviews, learning-paths...
│   │   ├── components/ui/           # Button, Card, Modal, ProgressBar, Skeleton, StatCard...
│   │   ├── routes/                  # AppRoutes, ProtectedRoute, ShellLayout
│   │   ├── i18n/locales/             # en.json, ur.json
│   │   └── hooks/                    # useAuth, useNotificationSocket, useSessionBootstrap
│   └── nginx.conf                    # Same-origin API/socket proxy for the production container
│
├── docker-compose.yml                # Mongo + Redis + API + client, one shared .env
├── setup-env.sh                      # Generates secure random secrets for .env
└── README.md                         # You are here 👋
```

**Backend domain modules:** `auth` · `users` · `courses` · `enrollments` · `assessments` · `progress` · `discussions` · `reviews` · `certificates` · `certificate-templates` · `learning-paths` · `live-classes` · `scorm` · `attendance` · `notifications` · `subscriptions` · `coupons` · `reports` · `analytics` · `uploads`

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** v20+
- **Docker &amp; Docker Compose** (recommended path)
- A **Cloudinary** account (file/video/SCORM storage)

### Option 1 — Docker Compose (recommended)

```bash
git clone https://github.com/Muzammil-khan-uni/ezitech-lms-deploy-ready.git
cd ezitech-lms-deploy-ready

./setup-env.sh          # generates secure random secrets into .env
# then fill in CLOUDINARY_* and SMTP_* values in .env

docker compose up --build
```

This starts MongoDB, Redis, the API, and an Nginx-served frontend as one networked stack.

### First-time setup — create the first admin

Public registration only ever creates **Student** accounts, so seed the first admin directly:

```bash
cd ezitech-lms-server
SEED_ADMIN_NAME="Jane Admin" SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD="a-strong-password" npm run seed:admin
```

Safe to re-run — it's a no-op if that email already exists. Log in as that admin, then use the **Users** screen to invite instructors, mentors, course managers, and further admins.

### Option 2 — Run services locally (without Docker)

```bash
# Backend
cd ezitech-lms-server
cp ../.env.example .env       # fill in Mongo/Redis/JWT/Cloudinary/SMTP values
npm install
npm run dev                    # nodemon, requires local Mongo + Redis

# Frontend (new terminal)
cd ezitech-lms-client
npm install
npm run dev
```

Health check → `GET /health` · API root → `GET /api/v1` · Interactive docs → `GET /api/v1/docs`

---

## 🔐 Environment Configuration

<div align="center">

| Variable | Purpose |
|:--|:--|
| `MONGO_URI` / `REDIS_URL` | Core datastore connections |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Min. 32-char secrets — server refuses to boot in production with a short/placeholder value |
| `MFA_ENCRYPTION_KEY` | Encrypts stored TOTP secrets — losing it disables everyone's MFA |
| `CLIENT_ORIGIN` / `SERVER_PUBLIC_URL` | Public URLs — must be `https://` in production (refresh cookie is `Secure` + `SameSite=Strict`) |
| `SCORM_CONTENT_ORIGIN` | Separate hostname for SCORM playback (must differ from the above two) |
| `TRUST_PROXY` | Reverse-proxy hop count used for real-client-IP-based rate limiting |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_FAILURE_WINDOW_MINUTES` / `LOGIN_LOCK_MINUTES` | Account lockout tuning |
| `INSTRUCTOR_COMMISSION_PERCENT` | Revenue share paid to instructors on paid courses |
| `SMTP_*` | Real SMTP in production; auto-falls back to an Ethereal test account in development |
| `CLOUDINARY_*` | File/video/SCORM/image storage |
| `SEED_ADMIN_*` | One-time values consumed by `npm run seed:admin` |

</div>

> 🔒 `./setup-env.sh` generates all the random secrets for you. If a `.env` was ever committed, zipped, or shared anywhere, treat every value in it as compromised and rotate immediately.

---

## 🔌 API Reference

The full, authoritative API contract is the hand-authored **OpenAPI 3.0 spec** (`openapi.yaml`, ~100 paths) — served live at:

- **Spec:** `GET /api/v1/openapi.yaml`
- **Interactive Swagger UI:** `GET /api/v1/docs`

<details>
<summary><b>Module → base-route map</b></summary><br>

| Module | Base route |
|:--|:--|
| Auth (incl. MFA, devices) | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Courses &amp; Categories | `/api/v1/courses` |
| Enrollments | `/api/v1/enrollments` |
| Assessments | `/api/v1/assessments` |
| Progress | `/api/v1/progress` |
| Discussions | `/api/v1/discussions` |
| Reviews | `/api/v1/reviews` |
| Certificates &amp; Templates | `/api/v1/certificates`, `/api/v1/certificate-templates` |
| Learning Paths | `/api/v1/learning-paths` |
| Live Classes | `/api/v1/live-classes` |
| SCORM | `/api/v1/scorm` |
| Attendance | `/api/v1/attendance` |
| Notifications | `/api/v1/notifications` |
| Subscriptions &amp; Coupons | `/api/v1/subscriptions`, `/api/v1/coupons` |
| Reports &amp; Analytics | `/api/v1/reports`, `/api/v1/analytics` |
| Uploads | `/api/v1/uploads` |

</details>

Every endpoint responds with the same success/error envelope shape — no route returns a bare array or object. A handful of read-only endpoints (public course catalog, certificate verification, subscription plans, course reviews) accept an **optional** token: anonymous callers get a public view, authenticated ones get a personalized view of the same resource.

---

## 🛡️ Security &amp; Production-Hardening

<div align="center">

| Layer | Protection |
|:--|:--|
| 🔑 Authentication | JWT access + refresh, `Secure` + `SameSite=Strict` refresh cookie, per-device session listing &amp; revocation |
| 🔐 MFA | TOTP (Speakeasy) with encrypted secrets, single-use recovery codes |
| 🚦 Rate Limiting | Redis-backed (`rate-limit-redis`) — correct across multiple API instances, not just in-process |
| 🧼 Input Safety | Custom Mongo-sanitization middleware, Joi validation on every mutating route |
| 🌐 Origin Control | `trustedOrigin` middleware on refresh/logout to resist CSRF-style abuse |
| 🪖 HTTP Headers | **Helmet** |
| 🔌 Real-time | Socket.IO Redis adapter — notifications reach every instance behind a load balancer |
| 📴 Fault Tolerance | Cache-aside course catalog **fails open** to the DB on any Redis error; email/reminder jobs never block requests |
| 🧾 RBAC, verified | Dedicated test suites prove course-content gating, assessment ownership, and discussion access can't be bypassed |

</div>

See [`ezitech-lms-server/DEPLOYMENT.md`](./ezitech-lms-server/DEPLOYMENT.md) for the full production-readiness checklist.

---

## 🧪 Testing

```bash
cd ezitech-lms-server
npm test              # jest --runInBand, sequential by design (see jest.config.js)
```

No real MongoDB, Redis, or SMTP server required — `mongodb-memory-server` spins up a real, in-memory `mongod`, and Redis/email are mocked. Notable coverage:

- **Auth** — registration, login (identical error for wrong-password vs. no-such-user), deactivated-account rejection, full forgot/reset-password flow, email verification (single-use tokens), MFA setup + TOTP-gated login + single-use recovery-code login.
- **RBAC — Courses** — anonymous/non-enrolled viewers get stripped content + 403; enrolled students get full access; preview lessons stay open; draft courses 404 (not 403) for everyone except owner/admin.
- **RBAC — Assessments** — an instructor can't touch another instructor's assessment; grades above the max are rejected; non-enrolled students can't start attempts.
- **RBAC — Discussions** — non-enrolled users can't read/post; students can't post announcements; unrelated instructors are blocked from another instructor's board.

See [`ezitech-lms-server/TESTING.md`](./ezitech-lms-server/TESTING.md) for the full breakdown.

---

## 🗺️ Roadmap

- [ ] 📱 Native mobile app for learners
- [ ] 🧠 AI-assisted quiz generation from lesson content
- [ ] 🌍 Additional language packs beyond English/Urdu
- [ ] 📊 Custom, per-tenant report builder
- [ ] 🔗 SSO / SAML integration for enterprise customers

Have an idea? Open an [issue](../../issues) — contributions are welcome!

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

```bash
1. Fork the project
2. Create your feature branch   → git checkout -b feature/amazing-feature
3. Commit your changes          → git commit -m "Add amazing feature"
4. Push to the branch           → git push origin feature/amazing-feature
5. Open a Pull Request 🎉
```

---

## 📬 Contact

<div align="center">

**M. Muzammil Khan**
Software Engineer · Full-Stack (MERN) · Flutter &amp; Android

[![Email](https://img.shields.io/badge/Email-muz56565%40gmail.com-0ea5e9?style=for-the-badge&logo=gmail&logoColor=white)](mailto:muz56565@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/muhammed-muzammil-khan-617155373/)
[![GitHub](https://img.shields.io/badge/GitHub-Muzammil--khan--uni-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Muzammil-khan-uni)


</div>

---

## 📄 License

This project is licensed under the **GNU General Public License v2.0**. See the [`LICENSE`](./LICENSE) file for full terms.

---

<div align="center">

### ⭐ If this project helped you, consider giving it a star!

<img src="https://capsule-render.vercel.app/api?type=waving&amp;color=0:0ea5e9,100:0c4a6e&amp;height=120&amp;section=footer" width="100%"/>

</div>
