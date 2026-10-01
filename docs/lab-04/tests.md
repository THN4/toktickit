# Lab 4 Test Plan and Traceability

> **Status:** Planned before implementation. File paths below are target paths in this repository; replace with actual paths and record results after execution. Do not mark unrun tests Pass or call mocked browser tests real E2E.

## 1. Planned coverage

| ID | Type | AC / Rule | Scenario and expected result | Planned test file | Final |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03, AC-16/17 | Field lengths/date/conditional note and Completed Result validation; assignee role validation is covered by API-02 | `server/tests/lab-04/actions-taken.unit.test.ts` | Passed locally: 4 tests (2026-10-01) |
| UNIT-02 | Unit | AC-06/08/17 | Full Ticket and Action transition matrices plus resolution gate | `server/tests/lab-04/ticket-workflow.unit.test.ts` | Planned |
| API-01 | API/integration | AC-01/02/16 | Create under correct Ticket; creator/assignee/performer and owner may differ | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented; DB run pending |
| API-02 | API/authorization | AC-03/04/16/20 | Invalid fields, inactive/non-staff assignee, forged actor, Requester ownership/write denial, Admin permission | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented; DB run pending |
| API-03 | API/concurrency | AC-05/18 | Stale edit is 409; identical create retry yields one record; key reused with changed payload is 409 | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented; DB run pending |
| API-04 | API/workflow | AC-06/07/08/17 | Every allowed/denied Action/Ticket edge; resolution gate and advisory Requester indication | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-05 | API/concurrency | AC-05/08 | Stale Ticket claim/owner/priority/status update cannot overwrite newer state | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-06 | API/audit | AC-19 | Stable action/event order, no delete, append-only Public Comments/Internal Notes regression | `server/tests/lab-04/actions-taken.api.test.ts` | Action/event cases implemented; DB run pending; comment/note regression planned |
| API-07 | API/dashboard | AC-09/11 | Requester-owned counts, UTC window boundaries, legacy null resolvedAt, empty lists and no foreign records | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-08 | API/dashboard | AC-10/11/20 | Staff/Admin counts by all statuses and LOW/MEDIUM/HIGH, current assignee and completed performer, high-priority, exact query comparison | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-09 | API/safe failure | AC-21 | Health, invalid input, unauthenticated, forbidden, not-found, conflict and safe 500 envelopes | `server/tests/lab-04/safe-failure.api.test.ts` | Planned |
| MIG-01 | Migration/regression | AC-12 | Migrate representative Lab 3 copy and clean DB; preserve row counts, FKs, ownership and zero-action legacy Tickets | `server/tests/lab-04/migration.regression.test.ts` | Planned |
| MIG-02 | Seed | AC-13 | Run seed twice; stable IDs/rows and zero/non-zero dashboard fixtures | `server/tests/lab-04/seed.test.ts` | Planned |
| UI-01 | UI component | AC-01/03/04/05/16/17/18/19 | Action list/create/edit/assign/start/complete/cancel/read-only, validation, retry, conflict, audit | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI component | AC-09/11 | Requester cards/lists, owned detail links, My Tickets URL filter initialization, zero/empty/failure states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-03 | UI component | AC-10/11/20 | Staff/Admin metrics, current-user actions, Queue URL filter initialization, empty/forbidden/failure states | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-04 | UI component | AC-06/07/08/21 | Permitted Ticket transitions, resolve guidance, confirm, status refresh and preserved draft on conflict | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| STYLE-01 | UI style | AC-14 | Zen Green components, text-labelled badges, focus and error placement | `client/tests/lab-04/Lab4Styles.test.tsx` | Planned |
| RESP-01 | Responsive/visual | AC-14 | Dashboard and Actions desktop/tablet/mobile; no clipping, overlap or page overflow | `e2e/lab-04/responsive.spec.ts` | Planned |
| A11Y-01 | Accessibility | AC-14 | Keyboard operation, semantic labels, focus/dialog restoration and live feedback | `e2e/lab-04/accessibility.spec.ts` | Planned |
| PERF-01 | Performance smoke | AC-10 | Seeded dashboard query and bounded response (local target p95 <500 ms; record fixture size/hardware) | `server/tests/lab-04/dashboard-performance.test.ts` | Planned |
| E2E-01 | Real E2E | AC-01/02/04/16/17/18 | Browser→real API→PostgreSQL create/assign/complete/cancel; Requester reads all owned actions | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | Real E2E | AC-06/07/08/19 | Resolution blocked/unblocked, closure/cancellation/reopening, advisory indication, status/audit ordering | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | Real E2E | AC-09/10/11/20 | Both dashboards, DB-aligned metrics, drill-down, ownership, Admin access | `e2e/lab-04/dashboards.spec.ts` | Planned |
| REG-01 | Labs 1–3 regression | AC-15/19/20/21 | Authentication, ownership, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, staff operations, User Management | Existing Lab 1–3 suites; record actual paths/commands | Planned |

## 2. AC traceability

| AC | Test IDs |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-01, E2E-01 |
| AC-03 | UNIT-01, API-02, UI-01 |
| AC-04 | API-02, UI-01, E2E-01 |
| AC-05 | API-03, UI-01 |
| AC-06 | UNIT-02, API-04, UI-04, E2E-02 |
| AC-07 | API-04, UI-04, E2E-02 |
| AC-08 | UNIT-02, API-04, API-05, UI-04, E2E-02 |
| AC-09 | API-07, UI-02, E2E-03 |
| AC-10 | API-08, UI-03, PERF-01, E2E-03 |
| AC-11 | API-07, API-08, UI-02, UI-03, E2E-03 |
| AC-12 | MIG-01 |
| AC-13 | MIG-02 |
| AC-14 | STYLE-01, RESP-01, A11Y-01 |
| AC-15 | REG-01 |
| AC-16 | UNIT-01, API-01, API-02, UI-01, E2E-01 |
| AC-17 | UNIT-02, API-04, UI-01, E2E-01 |
| AC-18 | API-03, UI-01, E2E-01 |
| AC-19 | API-06, UI-01, E2E-02, REG-01 |
| AC-20 | API-02, API-08, UI-03, E2E-03, REG-01 |
| AC-21 | API-09, UI-04, REG-01 |

## 3. Execution and evidence rules

- Record the exact command, commit/branch, actual file path, result and evidence link for every executed group. Required tests must not be skipped or replaced with unrelated tests.
- Verify migration on a copy of previous data and a clean database, including recovery procedure; run idempotent seed twice.
- Real E2E must use the real client, Express server, session cookie and PostgreSQL without `page.route()` API mocks. If mocked browser tests are useful, label them UI integration.
- Run focused checks during each issue and the full unit/API/UI/authorization/workflow/regression/E2E suite on `lab4-staging` and final `main`. Capture selected database queries proving dashboard numbers.
- Capture readable desktop, tablet and mobile screenshots of staff dashboard, requester dashboard and Actions Taken, plus keyboard/visual checklist evidence under `artifacts/lab-04/screenshots/`.
