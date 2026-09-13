# Lab 3 Test Plan and Traceability

> **Status:** Planned before implementation. Final results are updated only after tests run on `main`.

## 1. Test Strategy

Coverage includes unit, API/integration, UI component, responsive/visual,
security/authorization, migration/regression, and E2E tests. Every acceptance
criterion in `specification.md` maps to at least one planned test.

| Test ID | Type | AC / Rule | What it verifies | Planned file | Final |
|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid active-user login establishes safe session | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-02 | API | AC-02 | Invalid/inactive login has safe denial | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-03 | Initial password blocks normal APIs until changed | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-04 | API | AC-04 | Logout invalidates session | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05 | Security | AC-05, BR-07 | Requester cannot select another requester ID | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-06 | Regression | AC-06 | Owned Lab 2 Ticket/Attachment flows remain available | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-07 | API | AC-07, BR-22–23 | Queue search/filter/sort/pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-08 | API | AC-08 | Invalid Queue query is 400 | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-09 | API | AC-09–11 | Claim/assignment/priority/status workflow validation | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-10 | API | AC-12–14 | Public Comments and protected Internal Notes | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-11 | API | AC-15–19 | User admin, duplicate email, password reset, admin safety | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| MIG-01 | Migration | AC-20 | Lab 2 users/tickets/attachments retain ownership | `server/tests/lab-03/migration.regression.test.ts` | Planned |
| UI-01 | UI | AC-01–03 | Login and Change Password validation/states | `client/tests/lab-03/Login.test.tsx`, `ChangePassword.test.tsx` | Planned |
| UI-02 | UI | AC-07–08 | Queue states, controls, and no-results | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| UI-03 | UI | AC-09–14 | Detail controls, comments, internal-note restriction | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| UI-04 | UI | AC-15–19 | User list/form and safety feedback | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| E2E-01 | E2E | AC-01–04 | Login, change password, logout, blocked direct access | `e2e/lab-03/authentication.spec.ts` | Planned |
| E2E-02 | E2E | AC-07–14 | Staff Queue through Ticket workflow | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-15–19 | Administrator account-management flow | `e2e/lab-03/user-administration.spec.ts` | Planned |
| VIS-01 | Visual | AC-21 | Major screens at desktop/tablet/mobile; no overflow | `e2e/lab-03/responsive.spec.ts` | Planned |

## 2. Traceability

| AC range | Planned evidence |
|---|---|
| AC-01–04 | API-01–04, UI-01, E2E-01 |
| AC-05–06 | API-05–06, MIG-01 |
| AC-07–08 | API-07–08, UI-02, E2E-02 |
| AC-09–14 | API-09–10, UI-03, E2E-02 |
| AC-15–19 | API-11, UI-04, E2E-03 |
| AC-20 | MIG-01 |
| AC-21 | VIS-01 |

## 3. Completion Rules

- Implement planned tests before or alongside their feature, not afterward.
- Record actual test paths and PASS/FAIL only after execution.
- No required test may be skipped, disabled, flaky, or substituted with an
  unrelated test.
- Run the full Lab 3 suite on `lab3-staging` before the release PR and on
  `main` for final submission evidence.
