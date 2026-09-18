# Lab 3 Peer Review Record

## My Information

| Field | Detail |
|---|---|
| **Name** | Thanatip Nitinantakul |
| **Student ID** | 67070501023 |
| **GitHub Username** | [ThnaChamp](https://github.com/ThnaChamp) |

---

## Peer Reviewer (Primary)

| Field | Detail |
|---|---|
| **Reviewer Name** | Kittithat Disthanakornkun |
| **Reviewer Student ID** | 67070501004 |
| **Reviewer GitHub Username** | [JeffMerry](https://github.com/JeffMerry) |

---

## Pull Requests Reviewed

> My partner reviewed the following Lab 3 PRs that I submitted to `lab3-staging`.

### PR 1 — feature/1-lab3-specifications → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#36](https://github.com/THN4/toktickit/pull/36) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | "Engineering contracts and specifications for Lab 3 are complete." |
| **My Response** | Thanked the reviewer and confirmed the complete documentation contract. |
| **Outcome** | Approved and merged on 2026-09-13 |

---

### PR 2 — feature/2-lab3-auth-foundation → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#37](https://github.com/THN4/toktickit/pull/37) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1)** | Requested changes; the review follow-up required the seed data to include three active and one inactive IT Staff user. |
| **My Response (1)** | Changed the `Quinn Walker` IT Staff seed fixture to `isActive: false`, then reported the updated seed composition and planned database-backed verification. |
| **Review Comment (2)** | "Everything is good." |
| **Outcome** | Approved and merged on 2026-09-15 |

---

### PR 3 — fix/lab3-spec-contract-consistency → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#39](https://github.com/THN4/toktickit/pull/39) |
| **Reviewer** | No formal peer review recorded |
| **Review Comment** | No review comment recorded; this was a focused contract correction. |
| **My Response** | Aligned BR-09 so only active IT Staff can own Tickets and Administrators remain scoped to User Management. |
| **Outcome** | Merged on 2026-09-15 |

---

### PR 4 — feature/3-lab3-authorization-requester-regression → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#40](https://github.com/THN4/toktickit/pull/40) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1)** | Requested regression coverage for spoofed `requesterId` values on Ticket creation and attachment endpoints. |
| **My Response (1)** | Added rejection tests for Ticket creation and attachment upload/download/delete, each returning `400 CLIENT_IDENTITY_NOT_ALLOWED`; requester regression tests passed 3/3. |
| **Review Comment (2)** | Confirmed that the corrections were made successfully and approved the follow-up. |
| **Outcome** | Approved and merged on 2026-09-16 |

---

### PR 5 — feature/4-lab3-staff-queue → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#41](https://github.com/THN4/toktickit/pull/41) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1)** | Requested documented Queue controls, metadata-driven pagination, Queue UI-state tests, Forbidden direct-route feedback, and unique fixtures. |
| **My Response (1)** | Added the controls, `totalPages` pagination, Forbidden state, unique fixtures, and Queue UI coverage. |
| **Review Comment (2)** | Requested distinct no-results, API failure/Retry, and page-size/pagination assertions, plus a mobile-safe card layout. |
| **My Response (2)** | Added no-results/failure/Retry/sorting/page-size coverage and responsive cards; reported 27 server tests, 22 client tests, and a passing build. |
| **Review Comment (3)** | Rechecked the final update and approved it. |
| **Outcome** | Approved and merged on 2026-09-17 |

---

### PR 6 — feature/5-lab3-staff-ticket-operations → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#42](https://github.com/THN4/toktickit/pull/42) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | Confirmed the migration, conditional claim behavior, authorization, workflow controls, comment/note visibility, and tests. No blocking issue found. |
| **My Response** | Thanked the reviewer; no corrective change was requested. |
| **Outcome** | Approved and merged on 2026-09-17 |

---

### PR 7 — feature/6-lab3-user-management → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#43](https://github.com/THN4/toktickit/pull/43) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1)** | Requested a mobile user-card layout and accessible field-level validation with API field information. |
| **My Response (1)** | Added mobile cards below 768px; API errors now identify fields; inputs use `aria-invalid` and `aria-describedby`; added responsive and validation tests. |
| **Review Comment (2)** | Rechecked the responsive layout and field-level validation; no blocking issues remained. Approved. |
| **Outcome** | Approved and merged on 2026-09-18 |

---

### PR 8 — feature/7-lab3-quality-evidence → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#44](https://github.com/THN4/toktickit/pull/44) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1)** | Mocked Playwright flows must not be presented as real E2E because they do not exercise the server, session cookies, or database. |
| **My Response (1)** | Reclassified them as mocked browser UI-integration tests; kept real E2E pending; added repeatable screenshots. During the evidence run, fixed Queue tablet overflow by switching to cards below the desktop breakpoint. |
| **Review Comment (2)** | Confirmed the revised classification, traceability, screenshot evidence, and Queue tablet fix; no blocking issues remained. Approved. |
| **Outcome** | Approved and merged on 2026-09-18 |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following Lab 3 PRs submitted by Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)).

### PR A — feature/11-lab3-spec-docs → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#26](https://github.com/JeffMerry/toktickit/pull/26) |
| **My Review Comment (1)** | Requested that planned client-test paths match the repository structure and that `URGENT` be implemented consistently in the Prisma enum, migration, API validation, UI, seeds, and tests. |
| **Partner's Response (1)** | Explained the planned test-path decision and confirmed that the priority migration would introduce `LOW`, `MEDIUM`, `HIGH`, and `URGENT` with matching coverage. |
| **My Review Comment (2)** | Acknowledged the explanation and approved the work. |
| **Outcome** | Approved by me and merged on 2026-09-15 |

---

### PR B — feature/12-lab3-user-database → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#28](https://github.com/JeffMerry/toktickit/pull/28) |
| **My Review Comment (1)** | Requested an unassigned seed Ticket for claim workflow and a requester-owned `requesterResolvedAt` field independent of formal Ticket status. |
| **Partner's Response (1)** | Added an unassigned seed Ticket, nullable owner seed handling, `requesterResolvedAt` migration/seed data, documentation updates, and regression coverage. |
| **My Review Comment (2)** | "All done, great job Kittithat." |
| **Outcome** | Approved by me and merged on 2026-09-15 |

---

### PR C — feature/13-lab3-authentication → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#30](https://github.com/JeffMerry/toktickit/pull/30) |
| **My Review Comment (1)** | Requested role-specific navigation so Requesters see Ticket actions, IT Staff see Queue, Administrators see User Management, plus client test coverage. |
| **Partner's Response (1)** | Updated navigation and placeholders by role, prevented non-Requester Ticket requests, added role-navigation tests, and reported build plus client tests passing. |
| **My Review Comment (2)** | "The issue I reported has been resolved; everything is in order. Great job." |
| **Outcome** | Approved by me and merged on 2026-09-16 |

---

### PR D — feature/14-lab3-staff-ticket-workflow → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#32](https://github.com/JeffMerry/toktickit/pull/32) |
| **My Review Comment (1)** | Asked whether Administrator Ticket workflow access was intentional and required the authorization matrix/specification to make the decision explicit if so. |
| **Partner's Response (1)** | Confirmed the approved specification explicitly permits Administrator operational Ticket access while normal navigation remains focused on User Management. |
| **My Review Comment (2)** | "Thanks for clarification, so everything is done." |
| **Outcome** | Clarification accepted; approved by me and merged on 2026-09-17 |

---

### PR E — feature/15-lab3-user-management → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#35](https://github.com/JeffMerry/toktickit/pull/35) |
| **My Review Comment (1)** | Requested a concurrency-safe “at least one active Administrator” safeguard and a concurrent regression test. |
| **Partner's Response (1)** | Put count, safeguard validation, user update, and session revocation inside a PostgreSQL transaction protected by an advisory lock; added concurrent cross-deactivation coverage. |
| **My Review Comment (2)** | "Okay great job Kittithat." |
| **Outcome** | Follow-up acknowledged; merged on 2026-09-17 |

---

### PR F — feature/16-lab3-release-integration → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#36](https://github.com/JeffMerry/toktickit/pull/36) |
| **My Review Comment** | "The content is comprehensive." |
| **Partner's Response** | Confirmed the release-integration documentation was ready to merge. |
| **Outcome** | Approved by me and merged on 2026-09-17 |

---

### PR G — feature/17-lab3-final-evidence → lab3-staging

| Field | Detail |
|---|---|
| **PR Link** | [#37](https://github.com/JeffMerry/toktickit/pull/37) |
| **My Review Comment (1)** | Requested Staff Ticket Detail tablet/mobile screenshots and consistent final statuses and file paths in `docs/lab-03/tests.md`. |
| **Partner's Response (1)** | Added Staff Ticket Detail tablet/mobile screenshots and linked the complete viewport set in the release-evidence matrix. Updated implemented tests to `Pass` with actual paths, while genuinely unimplemented coverage remains `Planned`; reported `npm run capture:lab3-evidence` passing 1 test and `npm run test:e2e` passing 4 tests. |
| **My Review Comment (2)** | Rechecked the follow-up: both requested items were complete, the capture/E2E results were recorded, and the PR was approved. |
| **Outcome** | Approved by me and merged on 2026-09-18 |

---

## Post-review Follow-up

After PR #44 was merged, Real E2E was added separately on `feature/8-lab3-real-e2e` so the original review record remains accurate: PR #44 contained mocked browser UI-integration evidence, not Real E2E. The follow-up suite uses the real client, Express server, session cookie, PostgreSQL database, and deterministic seed fixtures for E2E-01 through E2E-03. Each flow passed when executed individually; it will be recorded as a separate PR review after integration into `lab3-staging`.
