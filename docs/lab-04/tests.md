# Lab 4 Test Plan and Traceability

> **Status:** Issue 6 regression hardening executed locally on `feature/6-lab4-regression-hardening` (2026-10-06). Results below distinguish completed local checks from checks still pending. Mocked Playwright coverage is not real E2E.

## 1. Planned coverage

| ID | Type | AC / Rule | Scenario and expected result | Planned test file | Final |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-03, AC-16/17 | Field lengths/date/conditional note and Completed Result validation; assignee role validation is covered by API-02 | `server/tests/lab-04/actions-taken.unit.test.ts` | Passed locally: 4 tests (2026-10-01) |
| UNIT-02 | Unit/API | AC-06/08/17 | Ticket and Action transition matrices plus resolution gate | `server/tests/lab-04/ticket-workflow.api.test.ts` | Covered by API-04; no separate unit test file |
| API-01 | API/integration | AC-01/02/16 | Create under correct Ticket; creator/assignee/performer and owner may differ | `server/tests/lab-04/actions-taken.api.test.ts` | Passed locally (2026-10-01) |
| API-02 | API/authorization | AC-03/04/16/20 | Invalid fields, inactive/non-staff assignee, forged actor, Requester ownership/write denial, Admin permission | `server/tests/lab-04/actions-taken.api.test.ts` | Passed locally (2026-10-01) |
| API-03 | API/concurrency | AC-05/18 | Stale edit is 409; identical create retry yields one record; key reused with changed payload is 409 | `server/tests/lab-04/actions-taken.api.test.ts` | Passed locally, including simultaneous retries (2026-10-01) |
| API-04 | API/workflow | AC-06/07/08/17 | Every allowed/denied Action/Ticket edge; resolution gate and advisory Requester indication | `server/tests/lab-04/ticket-workflow.api.test.ts`; Lab 3 requester-indication regression | Passed in server suite (2026-10-06); real resolution gate also exercised in E2E-02 |
| API-05 | API/concurrency | AC-05/08 | Stale Ticket claim/owner/priority/status update cannot overwrite newer state | `server/tests/lab-04/ticket-workflow.api.test.ts` | Passed locally (2026-10-03) |
| API-06 | API/audit | AC-19 | Stable action/event order, no delete, append-only Public Comments/Internal Notes regression | `server/tests/lab-04/actions-taken.api.test.ts`; Lab 3 regression suite | Passed locally (2026-10-01) |
| API-07 | API/dashboard | AC-09/11 | Requester-owned counts, UTC 30-day exclusion, global attention top-five ordering, legacy null resolvedAt, empty lists and no foreign records | `server/tests/lab-04/requester-dashboard.api.test.ts` | Passed in server suite (2026-10-06), including indicated Ticket newer than fifth waiting Ticket and exact 30-day boundary |
| API-08 | API/dashboard | AC-10/11/20 | Staff/Admin counts by all statuses and LOW/MEDIUM/HIGH, current assignee and completed performer, high-priority, exact query comparison | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed in server suite (2026-10-06); database counts are queried as test oracles |
| API-09 | API/safe failure | AC-21 | Health, invalid input, unauthenticated, forbidden and not-found return safe error envelopes | `server/tests/lab-04/safe-failure.api.test.ts` | Passed in server suite (2026-10-06); this test does not induce a server 500 or conflict |
| MIG-01 | Migration/regression | AC-12 | Migrate representative Lab 3 copy and clean DB; preserve row counts, FKs, ownership and zero-action legacy Tickets | `server/tests/lab-04/migration.regression.test.ts` | Existing local DB migrated; legacy links/nullable resolvedAt/zero-action case passed; separate clean/copy runs pending |
| MIG-02 | Seed | AC-13 | Run seed twice; stable IDs/rows and zero/non-zero dashboard fixtures | `server/tests/lab-04/migration.regression.test.ts` | Seed run twice and stable action keys/rows checked locally; dashboard metric checks remain in API-07/08 |
| UI-01 | UI component | AC-01/03/04/05/16/17/18/19 | Action list/create/edit/assign/start/complete/cancel/read-only, validation, retry, conflict, audit | `client/tests/lab-04/ActionsTaken.test.tsx`; `client/tests/lab-03/StaffTicketDetail.test.tsx` | Component cases passed locally (2026-10-02); browser visual and real E2E evidence pending |
| UI-02 | UI component | AC-09/11 | Requester cards/lists, owned detail links, My Tickets URL filter initialization, zero/empty/failure states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Component tests passed locally (2026-10-05); real browser checks pending |
| UI-03 | UI component | AC-10/11/20 | Staff/Admin metrics, current-user actions, Queue URL filter initialization, empty/forbidden/failure states | `client/tests/lab-04/StaffDashboard.test.tsx` | Component tests passed locally (2026-10-05); direct-route role guard and browser checks pending |
| UI-04 | UI component | AC-06/07/08/21 | Permitted Ticket transitions, resolve guidance, confirm, status refresh and preserved draft on conflict | `client/tests/lab-04/TicketWorkflow.test.tsx` | Component cases passed locally (2026-10-03); real browser accessibility/E2E pending |
| STYLE-01 | UI style | AC-14 | Zen Green components, text-labelled badges, focus and error placement | `client/tests/lab-04/Lab4Styles.test.tsx` | Passed in client suite (2026-10-06) |
| RESP-01 | Responsive/visual | AC-14 | Dashboard and Actions desktop/tablet/mobile; no page horizontal overflow | `e2e/lab-04/responsive.real.spec.ts` | Passed real browser checks (2026-10-06); 12 screenshots saved under `artifacts/lab-04/screenshots/` |
| A11Y-01 | Accessibility | AC-14 | Keyboard operation, semantic labels, dialog focus trap/restoration and live feedback | `e2e/lab-04/actions-taken-flow.real.spec.ts`; `client/tests/lab-04/ActionsTaken.test.tsx` | Real E2E previously passed dialog keyboard trap and semantic labels; client component test verifies focus returns to the Actions Taken heading after the completing button is removed. New real E2E assertion still awaits PostgreSQL rerun |
| PERF-01 | Performance smoke | AC-10 | Ten seeded dashboard requests, local target p95 <500 ms | `server/tests/lab-04/staff-dashboard.api.test.ts` | Passed in server suite (2026-10-06); test logs measured p95; the run summary retained here does not include the numeric log |
| E2E-01 | Real E2E | AC-01/02/04/16/17/18 | Browser→real API→PostgreSQL ticket/action lifecycle, assignment, completion, follow-up and resolution gate | `e2e/lab-04/actions-taken-flow.real.spec.ts` | Passed as part of 7/7 real E2E tests (2026-10-06) before the latest focus-restoration assertion was added |
| E2E-02 | Real E2E | AC-06/07/08/19 | Resolution blocked/unblocked and reopening; API tests cover remaining workflow/audit edges | `e2e/lab-04/actions-taken-flow.real.spec.ts` | Passed as part of 7/7 real E2E tests (2026-10-06); cancellation and advisory indication are covered by API/component tests, not claimed as this browser scenario |
| E2E-03 | Real E2E | AC-09/10/11/20 | Both dashboards, role access, drill-down and ownership | `e2e/lab-04/dashboards.real.spec.ts` | Passed as part of 7/7 real E2E tests (2026-10-06) |
| REG-01 | Labs 1–3 regression | AC-15/19/20/21 | Authentication, ownership, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, staff operations, User Management | `e2e/lab-03/*.real.spec.ts`, client/server suites | Server 56/56 and client 58/58 passed (2026-10-06); real E2E 7/7 passed. Mocked browser runner displayed 9/9 passed but did not exit cleanly and was interrupted; Lab 2 stale browser tests are excluded because Lab 3 removed the requester selector. Staging/main reruns pending. |

## 2. AC traceability

| AC | Test IDs |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | API-01, E2E-01 |
| AC-03 | UNIT-01, API-02, UI-01 |
| AC-04 | API-02, UI-01, E2E-01 |
| AC-05 | API-03, UI-01 |
| AC-06 | API-04, UI-04, E2E-02 |
| AC-07 | API-04, UI-04, E2E-02 |
| AC-08 | API-04, API-05, UI-04, E2E-02 |
| AC-09 | API-07, UI-02, E2E-03 |
| AC-10 | API-08, UI-03, PERF-01, E2E-03 |
| AC-11 | API-07, API-08, UI-02, UI-03, E2E-03 |
| AC-12 | MIG-01 |
| AC-13 | MIG-02 |
| AC-14 | STYLE-01, RESP-01, A11Y-01 |
| AC-15 | REG-01 |
| AC-16 | UNIT-01, API-01, API-02, UI-01, E2E-01 |
| AC-17 | API-04, UI-01, E2E-01 |
| AC-18 | API-03, UI-01, E2E-01 |
| AC-19 | API-06, UI-01, E2E-02, REG-01 |
| AC-20 | API-02, API-08, UI-03, E2E-03, REG-01 |
| AC-21 | API-09, UI-04, REG-01 |

## 3. Execution and evidence rules

Issue 6 local execution on 2026-10-06 (branch `feature/6-lab4-regression-hardening`):

| Command | Result |
|---|---|
| `cd server && npm.cmd test -- --run` | Passed: 19 files, 56 tests |
| `cd server && npx.cmd tsc --noEmit` | Passed |
| `cd client && npm.cmd test -- --run` | Passed: 15 files, 58 tests |
| `cd client && npm.cmd run build` | Passed |
| `cd client && npm.cmd run lint` | Passed with one existing `react(only-export-components)` warning at `src/contexts/AuthContext.tsx:74` |
| `npm.cmd run test:e2e:real` | Passed: 7/7 real browser tests using the real API and PostgreSQL |
| `npm.cmd run test:e2e -- --reporter=list` | 9/9 mocked browser tests were reported passed, but the runner hung after the last test and was manually interrupted; not a clean command pass |
| Re-run `npm.cmd run test:e2e:real -- e2e/lab-04/actions-taken-flow.real.spec.ts` after adding focus-restoration assertion | Could not start: global setup's seed failed with PostgreSQL `ECONNREFUSED`; `docker compose up -d` also failed because Docker engine is unavailable in this environment |

The earlier 7/7 real E2E run generated the 12 Lab 4 responsive screenshots in `artifacts/lab-04/screenshots/`. The focus-restoration change is recorded but its new assertion remains pending a database-backed rerun. The mocked browser runner hang is recorded as a runner limitation, not a clean pass.

### Accessibility checklist

- [x] Actions Taken dialog has a semantic dialog role, accessible title and labelled controls.
- [x] Keyboard Tab navigation wraps within the Actions Taken status dialog (real browser E2E).
- [x] Focus returns to the Actions Taken heading if successful completion removes the original button (client component test).
- [x] Completion success is announced through a live status message; failures use an alert.
- [x] Create Ticket fields have associated labels and inline error descriptions.
- [x] Desktop, tablet and mobile screenshots exist for both dashboards and Actions Taken; responsive real E2E checks for page-level horizontal overflow.
- [ ] Rerun the complete real browser suite including the new focus restoration assertion when PostgreSQL is available.

- Record the exact command, commit/branch, actual file path, result and evidence link for every executed group. Required tests must not be skipped or replaced with unrelated tests.
- Migration/seed verification performed before this issue: seed was run twice and stable action keys/rows were checked. A separate copied Lab 3 database plus clean-database recovery run remains pending.
- Real E2E must use the real client, Express server, session cookie and PostgreSQL without `page.route()` API mocks. If mocked browser tests are useful, label them UI integration.
- Run focused checks during each issue and the full unit/API/UI/authorization/workflow/regression/E2E suite on `lab4-staging` and final `main`. Capture selected database queries proving dashboard numbers.
- Capture readable desktop, tablet and mobile screenshots of staff dashboard, requester dashboard and Actions Taken, plus keyboard/visual checklist evidence under `artifacts/lab-04/screenshots/`.
