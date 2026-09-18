# Lab 3 Test Plan and Traceability

> **Status:** Planned before implementation. Final results are updated only after tests run on `main`.

## 1. Test Strategy

Coverage includes unit, API/integration, UI component, responsive/visual,
security/authorization, migration/regression, and E2E tests. Every acceptance
criterion in `specification.md` maps to at least one planned test.

| Test ID | Type | AC / Rule | What it verifies | Planned file | Final |
|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid active-user login establishes safe session | `server/tests/lab-03/auth.api.test.ts` | Pass (database-backed) |
| API-02 | API | AC-02 | Invalid/inactive login has safe denial | `server/tests/lab-03/auth.api.test.ts` | Pass (database-backed) |
| API-03 | API | AC-03 | Initial password blocks normal APIs until changed | `server/tests/lab-03/auth.api.test.ts`, `server/tests/lab-03/authorization.api.test.ts` | Pass (database-backed) |
| API-04 | API | AC-04 | Logout invalidates session | `server/tests/lab-03/auth.api.test.ts` | Pass (database-backed) |
| API-05 | Security | AC-05, BR-07 | Requester cannot select another requester ID | `server/tests/lab-03/authorization.api.test.ts` | Pass (database-backed) |
| API-06 | Regression | AC-06 | Owned Lab 2 Ticket/Attachment flows remain available | `server/tests/lab-03/requester-regression.api.test.ts` | Pass (3 tests) |
| API-07 | API | AC-07, BR-22–23 | Queue search/filter/sort/default ordering/pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Pass (3 tests) |
| API-08 | API | AC-08 | Invalid Queue query is 400 | `server/tests/lab-03/staff-queue.api.test.ts` | Pass (3 tests) |
| API-09 | API | AC-09–11 | Claim/assignment/priority/status workflow validation and requester resolution | `server/tests/lab-03/staff-ticket-operations.api.test.ts` | Pass (4 tests) |
| API-10 | API | AC-12–14 | Public Comments and protected Internal Notes | `server/tests/lab-03/staff-ticket-operations.api.test.ts` | Pass (4 tests) |
| API-11 | API | AC-15–19 | User admin, duplicate email, password reset, admin safety | `server/tests/lab-03/users-admin.api.test.ts` | Pass (3 tests) |
| MIG-01 | Migration | AC-20 | Seeded Lab 3 User roles and Ticket/Attachment ownership relationships remain valid after migration | `server/tests/lab-03/migration.regression.test.ts` | Pass (1 test) |
| UI-01 | UI | AC-01–03 | Login and Change Password validation/states | `client/tests/lab-03/Authentication.test.tsx` | Pass (3 tests) |
| UI-05 | UI security | AC-04–05, AC-19 | Unauthenticated route redirect and Requester-only route guard | `client/src/App.test.tsx` | Pass (1 test) |
| UI-02 | UI | AC-07–08 | Queue loading, filters, no-results, failure/retry, badges, sorting, and pagination | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass (5 tests) |
| UI-03 | UI | AC-09–14 | Staff Detail controls/confirmations, comments, internal-note restriction, and requester resolution | `client/tests/lab-03/StaffTicketDetail.test.tsx`, `client/tests/lab-03/RequesterCollaboration.test.tsx` | Pass (5 tests) |
| UI-04 | UI | AC-15–19, AC-21 | User list/form, field validation, responsive mobile cards, and safety feedback | `client/tests/lab-03/UserManagement.test.tsx` | Pass (5 tests) |
| BUI-01 | Mocked browser UI integration | AC-01–04 | Login, password-change, logout, and route-guard UI states; API is mocked with `page.route()` | `e2e/lab-03/authentication.spec.ts` | Pass (2 tests) |
| BUI-02 | Mocked browser UI integration | AC-07–08 | Staff Queue rendering, search, and status-filter UI; API is mocked with `page.route()` | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass (1 test) |
| BUI-03 | Mocked browser UI integration | AC-15–17 | Administrator list/filter/create UI; API is mocked with `page.route()` | `e2e/lab-03/user-administration.spec.ts` | Pass (1 test) |
| E2E-01 | Real E2E | AC-01–04 | Real server, session cookie, seeded database authentication flow | `e2e/lab-03/authentication.real.spec.ts` | Pending |
| E2E-02 | Real E2E | AC-07–14 | Real server, seeded database IT Staff ticket workflow | `e2e/lab-03/staff-ticket-flow.real.spec.ts` | Pending |
| E2E-03 | Real E2E | AC-15–19 | Real server, seeded database Administrator account-management flow | `e2e/lab-03/user-administration.real.spec.ts` | Pending |
| VIS-01 | Mocked visual/responsive | AC-21 | User Management at desktop/tablet/mobile; no overflow; API is mocked | `e2e/lab-03/responsive.spec.ts` | Pass (1 test; 3 screenshots) |

## 2. Traceability

| AC range | Planned evidence |
|---|---|
| AC-01–04 | API-01–04, UI-01, BUI-01, E2E-01 (pending real evidence) |
| AC-05–06 | API-05–06, MIG-01 |
| AC-07–08 | API-07–08, UI-02, BUI-02, E2E-02 (pending real evidence) |
| AC-09–14 | API-09–10, UI-03, E2E-02 (pending real evidence) |
| AC-15–19 | API-11, UI-04, BUI-03, E2E-03 (pending real evidence) |
| AC-20 | MIG-01 |
| AC-21 | VIS-01 |

## 3. Completion Rules

- Implement planned tests before or alongside their feature, not afterward.
- Record actual test paths and PASS/FAIL only after execution.
- No required test may be skipped, disabled, flaky, or substituted with an
  unrelated test.
- Run the full Lab 3 suite on `lab3-staging` before the release PR and on
  `main` for final submission evidence.
