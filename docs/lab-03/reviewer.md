# Lab 3 Peer Review Record

## My Information

| Field | Detail |
|---|---|
| Name | _To be completed by the student_ |
| Student ID | _To be completed by the student_ |
| GitHub Username | _To be completed by the student_ |

## Review scope and method

This record covers every Pull Request merged into `lab3-staging` for Lab 3:
[#36](https://github.com/THN4/toktickit/pull/36),
[#37](https://github.com/THN4/toktickit/pull/37),
[#39](https://github.com/THN4/toktickit/pull/39), and
[#40](https://github.com/THN4/toktickit/pull/40) through
[#44](https://github.com/THN4/toktickit/pull/44).

For each PR, the GitHub review decision, review text, and follow-up discussion
were checked. `JeffMerry` was the peer reviewer where a formal peer review was
recorded. PR #39 had no formal review or review comment recorded; it is listed
for complete Lab 3 traceability.

## Pull Request review trail

| PR | Scope | Peer-review finding | Response and verification | Outcome |
|---|---|---|---|---|
| [#36](https://github.com/THN4/toktickit/pull/36) | Lab 3 specification, UI/API contracts, test plan, AI-use and review templates | JeffMerry approved the engineering contracts as complete. | Cross-document scope, business-rule, API/UI, acceptance-criteria, and planned-test coverage was reviewed before merge. | Approved and merged to `lab3-staging` on 2026-09-13. |
| [#37](https://github.com/THN4/toktickit/pull/37) | User migration, authentication, sessions, Login and Change Password | A change was requested in the first review. The follow-up discussion identified the IT Staff seed-state requirement. | `Quinn Walker` was made inactive, giving three active and one inactive IT Staff seed users. The reviewer then approved the follow-up. | Approved and merged on 2026-09-15. |
| [#39](https://github.com/THN4/toktickit/pull/39) | Contract correction for Ticket ownership | No formal peer review or discussion was recorded. | BR-09 was aligned so only an active IT Staff user can own a Ticket; Administrator scope remains User Management. `git diff --check` and cross-document contract review were reported. | Merged on 2026-09-15. |
| [#40](https://github.com/THN4/toktickit/pull/40) | Requester authorization and Lab 2 regression | JeffMerry requested explicit regression coverage for client-supplied `requesterId` on Ticket creation and attachment endpoints. | Added spoofed-identity tests for Ticket creation, attachment upload/download/delete, and attachment-delete verification. Each rejects the request with `400 CLIENT_IDENTITY_NOT_ALLOWED`; requester regression tests passed 3/3. | Approved and merged on 2026-09-16. |
| [#41](https://github.com/THN4/toktickit/pull/41) | IT Staff Queue API and responsive UI | Initial review found missing Queue controls, metadata-driven pagination, UI-state coverage, a safe Forbidden route, and a potential narrow-screen card overflow. A second review required no-results, Retry, and actual page-size/pagination assertions. | Implemented documented controls and `totalPages` pagination, Forbidden state, unique fixtures, Queue UI tests, no-results/failure/Retry/sorting/page-size coverage, and a mobile-safe card layout. Final validation reported 27 server tests, 22 client tests, and a production build passing. | Approved and merged on 2026-09-17. |
| [#42](https://github.com/THN4/toktickit/pull/42) | IT Staff Ticket Detail operations, workflow migration, comments and notes | JeffMerry found no blocking issues. The review confirmed conditional Ticket claiming, authorization, owner/status/priority controls, visibility separation for Public Comments and Internal Notes, and relevant tests. | No corrective follow-up was required; server/client tests, build, migration, and seed rerun were reported passing. | Approved and merged on 2026-09-17. |
| [#43](https://github.com/THN4/toktickit/pull/43) | Administrator User Management | JeffMerry required a mobile card/list layout without horizontal scrolling and accessible field-level validation for create/edit errors. | Added mobile cards below 768px; API errors identify their field; client inputs use `aria-invalid` and `aria-describedby`; responsive and validation tests were added. Final validation reported 34 server tests, 32 client tests, build, and diff check passing. | Approved and merged on 2026-09-18. |
| [#44](https://github.com/THN4/toktickit/pull/44) | Quality evidence, browser tests, responsive screenshots, and release evidence | JeffMerry noted that Playwright started only the client and mocked APIs with `page.route()`, so it was not real E2E evidence. | Reclassified those tests as mocked browser UI-integration tests, retained real server/session/database E2E items as Pending, and aligned README and traceability. Added repeatable visual evidence. A 768px Queue overflow found during evidence generation was fixed by using cards below the desktop breakpoint. | Approved and merged on 2026-09-18. |

## Review outcomes

- Every Lab 3 PR in this record was merged into `lab3-staging` after approval or, for PR #39, after its focused documentation correction.
- Review feedback produced concrete improvements in authorization regression coverage, Queue behavior and responsive layout, Administrator validation accessibility, evidence classification, and tablet overflow handling.
- Browser UI-integration evidence must not be represented as real end-to-end evidence. Real server, session-cookie, and seeded-database E2E coverage remains a separate pending requirement in [tests.md](tests.md).
