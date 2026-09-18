# TokTickIT

TokTickIT is an IT Service Desk web application developed for **CPE334: Introduction to Software Engineering in the Age of AI Agents**.

The project is developed iteratively through multi-sprint laboratory milestones:
- **Lab 1:** Foundation vertical slice (React UI → Express REST API → Prisma ORM → PostgreSQL).
- **Lab 2:** Requester Ticketing MVP with complete ticket creation, dashboard filtering, attachment lifecycle management, and responsive design.
- **Lab 3:** Authenticated role-based service desk with Requester, IT Staff, and Administrator workflows.

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
│   └── lab-02/
│       └── screenshots/        # Visual regression & responsive screenshots (15 states)
│           ├── requester-selection/
│           ├── create-ticket/
│           ├── my-tickets/
│           └── ticket-detail/
├── client/                     # React + Vite frontend with Tailwind CSS
│   ├── src/
│   │   ├── components/         # NavBar (with Mobile Hamburger Drawer), UI elements
│   │   ├── pages/              # SelectRequester, MyTickets, CreateTicket, TicketDetail
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
│   └── lab-02/                 # Lab 2 specifications, UI/API specs, reviewer, ai_use
├── e2e/
│   └── lab-02/                 # Playwright E2E & visual responsive test suites
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
Executes all unit tests (`UNIT-01` to `UNIT-09`) and API integration tests (`API-01` to `API-06`).

### 2) Frontend UI Component Tests (Vitest)
```bash
cd client
npm test
```
Executes client rendering and interaction tests.

### 3) End-to-End & Responsive Visual Tests (Playwright)
From the repository root:
```bash
# Run all E2E and visual tests
npx playwright test

# Or view interactive test report
npx playwright show-report
```

### Lab 3 quality evidence

```bash
npx playwright test e2e/lab-03 --project=desktop-chrome
```

This runs deterministic mocked browser UI-integration coverage for
authentication, IT Staff queue filtering, Administrator user creation, and
responsive User Management. It starts the client only and intercepts API
requests, so it is not evidence of real server/session/database E2E behavior.
The visual test writes desktop, tablet, and mobile screenshots to
`artifacts/lab-03/screenshots/user-management/`.
Automatically verifies all 7 user lifecycle flows (`E2E-01` to `E2E-07`) and captures all 15 responsive screenshots under `artifacts/lab-02/screenshots/`.

---

## Lab Deliverables & Documentation

### Lab 1:
- [Lab 1 Labsheet](file:///docs/lab-01/Lab1_Labsheet.md)
- [Lab 1 Peer Review](file:///docs/lab-01/reviewer.md)
- [Lab 1 AI Use & Reflection](file:///docs/lab-01/ai_use.md)
- [Lab 1 Test Records](file:///docs/lab-01/tests.md)

### Lab 2:
- [Sprint 2 Specification](file:///docs/lab-02/specification.md) — Comprehensive business rules and acceptance criteria
- [REST API Specification](file:///docs/lab-02/api-spec.md) — Endpoint contracts, request/response formats, error codes
- [UI Specification](file:///docs/lab-02/ui-spec.md) — Zen Green design system, layout rules, screenshot requirements
- [Test Plan & Verification Records](file:///docs/lab-02/tests.md) — 48 automated test cases with 100% Pass status
- [Lab 2 Peer Review](file:///docs/lab-02/reviewer.md) — PR review feedback, author responses, and merge records
- [Lab 2 AI Use & Reflection](file:///docs/lab-02/ai_use.md) — Prompt catalog, engineering insights, and AI reflection
- [Visual Screenshots](file:///artifacts/lab-02/screenshots/) — 15 automated screenshots matching UI-Spec Section 12

---

## Lab 2 Acceptance Summary

- **Requester Context & Isolation:** Development requester selection simulating authenticated sessions; strict data isolation across requesters with 403 Forbidden protection.
- **Atomic Ticket Number Generation:** Format `TKT-YYYY-NNNNNN` with transaction-safe yearly rollover.
- **Support Ticket Dashboard:** Search by keyword/number, filter by category/priority/status, pagination, and deterministic secondary sorting (`ticketNumber DESC`).
- **Attachment Lifecycle Management:** Allowed types (JPG, PNG, WEBP, PDF $\le$ 5 MB, max 5 active attachments), and audit-compliant soft-deletion requiring a reason.
- **Zen Green Design & Responsiveness:** Fully responsive interface across Desktop (1280px), Tablet (768px), and Mobile (375px) featuring a collapsible mobile hamburger drawer and zero horizontal overflow.
