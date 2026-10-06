# TokTickIT

TokTickIT is an IT Service Desk web application developed for **CPE334: Introduction to Software Engineering in the Age of AI Agents**.

The project is developed iteratively through multi-sprint laboratory milestones:
- **Lab 1:** Foundation vertical slice (React UI → Express REST API → Prisma ORM → PostgreSQL).
- **Lab 2:** Requester Ticketing MVP with complete ticket creation, dashboard filtering, attachment lifecycle management, and responsive design.
- **Lab 3:** Authenticated role-based service desk with Requester, IT Staff, and Administrator workflows.
- **Lab 4:** Action Taken tracking, Ticket resolution workflow, and role-based operational dashboards.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Multer (file upload)
- **Database:** PostgreSQL (Docker containerized)
- **Testing & Verification:**
  - Unit & Integration: Vitest, React Testing Library, Supertest
  - End-to-End (E2E) & Responsive Visual: Playwright (Headless Chromium)

---

## Repository Structure

```text
toktickit/
├── artifacts/
│   ├── lab-02/                 # Lab 2 visual evidence
│   ├── lab-03/
│   │   └── screenshots/        # Playwright evidence for auth, Queue, Detail, and admin screens
│   └── lab-04/
│       └── screenshots/        # Real E2E dashboard and Actions Taken responsive evidence
├── client/                     # React + Vite frontend with Tailwind CSS
│   ├── src/
│   │   ├── components/         # NavBar (with Mobile Hamburger Drawer), UI elements
│   │   ├── pages/              # Auth, Requester, IT Staff, and Administrator screens
│   │   └── services/           # Axios / Fetch API client services
│   └── tests/
├── server/                     # Express + Prisma backend
│   ├── prisma/                 # Schema models, migrations, seed script
│   ├── src/
│   │   ├── controllers/        # Business logic for requesters, tickets, attachments
│   │   ├── routes/             # RESTful API endpoints
│   │   └── utils/              # Ticket number generation, validation helpers
│   └── tests/
│       ├── lab-01/             # Lab 1 test suite
│       └── lab-02/             # Lab 2 unit & API integration test suite
├── docs/
│   ├── lab-01/                 # Lab 1 specifications, tests, reviewer, ai_use
│   ├── lab-02/                 # Lab 2 specifications, UI/API specs, reviewer, ai_use
│   ├── lab-03/                 # Lab 3 engineering, API/UI, test, review, and AI-use records
│   └── lab-04/                 # Lab 4 engineering, API/UI, test, review, and AI-use records
├── e2e/
│   ├── lab-02/                 # Lab 2 Playwright suites
│   ├── lab-03/                 # Lab 3 browser UI-integration and visual suites
│   └── lab-04/                 # Lab 4 real browser, database-backed and responsive checks
├── docker-compose.yml          # PostgreSQL container definition
├── playwright.config.ts        # Playwright E2E test configuration
├── package.json                # Root package & test scripts
└── README.md
```

---

## Getting Started

### 1) Prerequisites
- Node.js (v20+ recommended)
- Docker & Docker Compose (for PostgreSQL)

### 2) Database Setup
Start the local PostgreSQL container:
```bash
docker compose up -d
```

Configure `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"
PORT=3000
CLIENT_ORIGIN="http://localhost:5173"
# Local development only. Choose a private value; never commit it.
LAB3_INITIAL_PASSWORD="replace-with-a-local-development-password"
```

Run database migrations and seed data:
```bash
cd server
npm install
npx prisma migrate dev
npm run seed
cd ..
```

### 3) Install Dependencies & Run Applications

#### Client:
```bash
cd client
npm install
npm run dev
```
Client runs at `http://localhost:5173`.

#### Server:
```bash
cd server
npm run dev
```
Server runs at `http://localhost:3000`.

---

## Running Automated Tests

### 1) Backend Unit & Integration Tests (Supertest & Vitest)
```bash
cd server
npm test
```
Executes the server unit and database/API integration suites across the implemented labs. Database-backed tests require a reachable, migrated PostgreSQL database and any documented test fixtures.

### 2) Frontend UI Component Tests (Vitest)
```bash
cd client
npm test
```
Executes client rendering and interaction tests.

### 3) End-to-End & Responsive Visual Tests (Playwright)
From the repository root:
```bash
# Run mocked browser UI-integration and visual tests
npm run test:e2e

# Run real browser E2E against the Express server and PostgreSQL
npm run test:e2e:real

# Or view interactive test report
npx playwright show-report
```

### Lab 3 quality evidence

```bash
# Run only Lab 3 database-backed API and security tests
npm --prefix server test -- lab-03

# Run only Lab 3 React UI component tests
npm --prefix client test -- lab-03

# Run all Lab 3 Playwright browser UI-integration and visual tests
npm run test:e2e -- e2e/lab-03
```

The API tests require PostgreSQL to be running and a migrated/seeded local
database. The Playwright command starts the Vite client and runs deterministic
mocked browser UI-integration coverage for Authentication, IT Staff Queue,
Ticket Detail, User Management, and responsive visual evidence. These tests
use `page.route()` for API interception, so they must not be described as Real
E2E server/session/database verification.

Screenshots are generated under `artifacts/lab-03/screenshots/` for
Authentication, Queue, Staff Ticket Detail, and User Management at the required
desktop, tablet, and mobile viewports.

### Lab 4 quality evidence

```bash
# Run Lab 4 API/database integration checks
npm --prefix server test -- lab-04

# Run Lab 4 React UI component checks
npm --prefix client test -- lab-04

# Run real browser flows using the real session, API, and PostgreSQL database
npm run test:e2e:real
```

The real E2E command resets only the deterministic Lab 3 login fixtures before
running. It requires Docker PostgreSQL, applied Prisma migrations, and
`LAB3_INITIAL_PASSWORD` in the private `server/.env` file. It verifies role
dashboards, ownership, Actions Taken lifecycle, resolution gates, and responsive
screens. Screenshots are saved to `artifacts/lab-04/screenshots/` at desktop
(1280px), tablet (768px), and mobile (375px). The regular `npm run test:e2e`
command runs current Lab 3 browser UI-integration tests that intercept API
requests; those are not real server/database E2E. It excludes the archived Lab 2
browser flows, which still expect the unauthenticated requester selector removed
in Lab 3. Lab 2 API/component behavior and authenticated requester flows remain
covered by the current suites.

---

## Lab Deliverables & Documentation

### Lab 1

- [Lab 1 Labsheet](docs/lab-01/Lab1_Labsheet.md) — Full-stack vertical-slice requirements
- [Test Records](docs/lab-01/tests.md) — Lab 1 test evidence
- [Peer Review](docs/lab-01/reviewer.md) — Peer-review and pull-request record
- [AI Use and Reflection](docs/lab-01/ai_use.md) — AI-use record and reflection

### Lab 2

- [Lab 2 Labsheet](docs/lab-02/Lab_02_labsheet.md) — Requester Ticketing MVP requirements
- [Sprint Engineering Specification](docs/lab-02/specification.md) — Functional requirements, business rules, data changes, and acceptance criteria
- [REST API Contract](docs/lab-02/api-spec.md) — Request/response contracts and safe error behavior
- [UI Specification](docs/lab-02/ui-spec.md) — Zen Green design system, layouts, responsive rules, and screenshot paths
- [Test Plan and Results](docs/lab-02/tests.md) — Automated-test plan, traceability, commands, and recorded results
- [Peer Review Record](docs/lab-02/reviewer.md) — Review feedback, responses, and merge outcomes
- [AI Use and Reflection](docs/lab-02/ai_use.md) — Prompt catalog and reflection
- [Visual Screenshots](artifacts/lab-02/screenshots/) — Repeatable screenshots for requester selection, Ticket creation, My Tickets, and Ticket Detail

### Lab 3:
- [Sprint Engineering Specification](docs/lab-03/specification.md) — Scope, functional requirements, business rules, acceptance criteria, and definition of done
- [REST API Contract](docs/lab-03/api-spec.md) — Session authentication, role authorization, Queue, Ticket workflow, comments/notes, and User Management endpoints
- [UI Specification](docs/lab-03/ui-spec.md) — Zen Green screens, route states, accessibility, and responsive rules
- [Test Plan and Traceability](docs/lab-03/tests.md) — Acceptance-criterion mapping across API, UI, browser, visual, and Real E2E coverage
- [Peer Review Record](docs/lab-03/reviewer.md) — Authored PR reviews, partner reviews, reviewer feedback, responses, and outcomes
- [AI Use Record](docs/lab-03/ai-use.md) — Selected prompts and Thai reflections
- [Lab 3 Labsheet](docs/lab-03/Lab_3_sheet.md) — Lab 3 source requirements
- [Visual Screenshots](artifacts/lab-03/screenshots/) — Repeatable Playwright screenshots for Lab 3 screens and states

### Lab 4
- [Sprint Engineering Specification](docs/lab-04/specification.md) — Scope, requirements, business rules, acceptance criteria, and definition of done
- [REST API Contract](docs/lab-04/api-spec.md) — Actions Taken, workflow, dashboard, authorization, and safe error contracts
- [UI Specification](docs/lab-04/ui-spec.md) — Role dashboards, Actions Taken, accessibility, responsive rules, and evidence paths
- [Test Plan and Results](docs/lab-04/tests.md) — Acceptance traceability, actual test commands/results, and evidence status
- [Peer Review Record](docs/lab-04/reviewer.md) — Review findings, replies, and outcomes
- [AI Use Record](docs/lab-04/ai-use.md) — Selected prompts, outcomes, and a reflection draft for review
- [Visual Screenshots](artifacts/lab-04/screenshots/) — Real browser evidence for dashboard and Actions Taken layouts
- [Lab 4 Submission Report (local review draft)](output/pdf/Lab04.pdf) — Parts 1–9 in the required order; pending final-main tests, migration evidence and Project status verification

---

## Lab 2 Acceptance Summary

- **Requester Context & Isolation:** Development requester selection simulating authenticated sessions; strict data isolation across requesters with 403 Forbidden protection.
- **Atomic Ticket Number Generation:** Format `TKT-YYYY-NNNNNN` with transaction-safe yearly rollover.
- **Support Ticket Dashboard:** Search by keyword/number, filter by category/priority/status, pagination, and deterministic secondary sorting (`ticketNumber DESC`).
- **Attachment Lifecycle Management:** Allowed types (JPG, PNG, WEBP, PDF $\le$ 5 MB, max 5 active attachments), and audit-compliant soft-deletion requiring a reason.
- **Zen Green Design & Responsiveness:** Fully responsive interface across Desktop (1280px), Tablet (768px), and Mobile (375px) featuring a collapsible mobile hamburger drawer and zero horizontal overflow.

---

## Lab 3 Acceptance Summary

- **Authentication and Session Safety:** Active users sign in with email/password, must change an initial password before normal access, and can log out to invalidate their session.
- **Role-Based Authorization:** The server enforces separate Requester, IT Staff, and Administrator permissions; Requester Ticket ownership always comes from the authenticated session.
- **IT Staff Ticketing:** IT Staff can search/filter/sort/paginate the Queue, claim or assign Tickets, set IT Priority, perform permitted formal status transitions, and collaborate through Public Comments and Internal Notes.
- **Administrator User Management:** Administrators can search, create, edit, deactivate, and reset the initial password for one-role user accounts while protecting self-deactivation and the last active Administrator.
- **Regression, Responsive, and Evidence Coverage:** Lab 2 requester flows remain protected; Lab 3 includes database-backed API tests, UI tests, mocked browser UI-integration/visual evidence, and separately reviewed Real E2E coverage.

## Lab 4 Acceptance Summary

- **Actions Taken:** IT Staff and Administrators can create, assign, start, complete, cancel, and correct audited actions. Requesters can read actions only on their own Tickets.
- **Ticket resolution:** Formal resolution requires completed work with a result and no pending action or outstanding required follow-up. Requester resolution indications remain advisory.
- **Role dashboards:** Requester counts and lists are ownership-scoped; IT Staff and Administrator dashboards show documented operational counts and Queue drill-downs.
- **Quality and evidence:** Lab 4 includes API/database integration, component/UI, real browser E2E, regression, keyboard/accessibility, and desktop/tablet/mobile checks. See `docs/lab-04/tests.md` for recorded commands and results.
