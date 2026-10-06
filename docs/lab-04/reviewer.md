# Lab 4 Peer Review Record

## My Information

| Field | Detail |
|---|---|
| **Name** | Thanatip Nitinantakul |
| **Student ID** | 67070501023 |
| **GitHub Username** | [THN4](https://github.com/THN4) |

---

## Peer Reviewer (Primary)

| Field | Detail |
|---|---|
| **Reviewer Name** | Kittithat Disthanakornkun |
| **Reviewer Student ID** | 67070501004 |
| **Reviewer GitHub Username** | [JeffMerry](https://github.com/JeffMerry) |

---

## Pull Requests Reviewed

> My partner reviewed the following Lab 4 PRs that I submitted to `lab4-staging`. Review submissions and direct response text are recorded; repeated quoted review text is omitted. No inline review threads were recorded for these PRs.

### PR 1 — docs/1-lab4-engineering-contract → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#55](https://github.com/THN4/toktickit/pull/55) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | Reviewed the Lab 4 engineering contract and test plan.<br><br>The specification clearly defines the Actions Taken model, workflow rules, dashboard calculations, authorization, migration strategy, API contract, UI behavior, acceptance criteria, and planned test coverage. The scope exclusions and final regression expectations are also clear.<br><br>The proposed decisions are appropriately marked as draft items for team review before implementation. No blocking issues found from the Lab 4 contract review.<br><br>Approved. |
| **My Response** | Thanks for review Kittithat. you can merge now. |
| **Outcome** | Approved and merged on 2026-09-29. Review submitted at 2026-09-29 15:20:44 UTC. |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-55.png`. |

---

### PR 2 — feature/2-lab4-actions-foundation → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#56](https://github.com/THN4/toktickit/pull/56) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | Reviewed the Lab 4 Actions Taken foundation. The additive migration, stable seed fixtures, session-derived actors, idempotent creation, optimistic version checks, lifecycle validation, and append-only audit events are implemented consistently. The accompanying API, concurrency, and migration-regression coverage is appropriate for this issue. No blocking issues found. Approved. |
| **My Response** | Thanks for review Kittithat. you can merge now. |
| **Outcome** | Approved and merged on 2026-10-01. Review submitted at 2026-10-01 09:26:04 UTC. |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-56.png`. |

---

### PR 3 — feature/3-lab4-actions-ui → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#57](https://github.com/THN4/toktickit/pull/57) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1) — Changes requested** | One requested change before approval:<br><br>`ActionsTakenSection` loads the Action list and assignee lookup together with `Promise.all`. If `/staff/action-assignees` fails while the Action list succeeds, the whole section enters `loadError` and hides Actions that the user is still authorized to read. Please separate the assignee-loading error/retry flow (or use `Promise.allSettled`) so the Action list remains visible and a staff member can retry just the assignee lookup.<br><br>The rest of the Actions Taken UI, lifecycle controls, conflict handling, role routing, and test coverage look good. |
| **My Response (1)** | Thank for review. you can merge now. |
| **Review Comment (2) — Follow-up approval** | Re-reviewed the follow-up change. The Action list now remains available when the assignee lookup fails, and staff can retry the assignee lookup separately. The regression coverage reflects that behavior. The rest of the Actions Taken UI and role access changes look good to me. |
| **Outcome** | Changes requested on 2026-10-02 16:53:58 UTC; follow-up approved on 2026-10-03 06:40:07 UTC and merged on 2026-10-03. [PR discussion comment](https://github.com/THN4/toktickit/pull/57#issuecomment-5966586455). |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-57.png`. |

---

### PR 4 — feature/4-lab4-ticket-workflow → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#58](https://github.com/THN4/toktickit/pull/58) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | Reviewed the Lab 4 Ticket workflow implementation.<br><br>The transition matrix, confirmation requirements, resolution prerequisites, and optimistic version checks are enforced by the backend. The Staff/Admin workflow UI also refreshes safely after Action changes and provides conflict recovery without discarding selected values.<br><br>The added API and UI coverage matches the workflow rules. No blocking issues found. |
| **My Response** | Thank you Kittithat, you can merge now. |
| **Outcome** | Approved and merged on 2026-10-04. Review submitted at 2026-10-04 07:13:37 UTC. |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-58.png`. |

---

### PR 5 — feature/5-lab4-dashboards → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#59](https://github.com/THN4/toktickit/pull/59) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment (1) — Changes requested** | One requested change before approval:<br><br>`attentionTickets` is built from two independently ordered and limited queries (`waiting` and `indicated`), then concatenated. That does not preserve the contract’s global top-five ordering by `updatedAt DESC, ticketNumber DESC`: for example, five older Waiting-for-Requester tickets can fill the list while a newer requester-indicated ticket is omitted.<br><br>Please fetch attention tickets through one combined predicate (or merge and sort the full candidate sets) with a single ordering and `take: 5`. Add a regression case where an indicated ticket is newer than the fifth waiting ticket, and verify it appears in the returned attention list. |
| **My Response (1)** | Addressed in commit `86f3f30`.<br><br>`attentionTickets` now uses one combined Prisma predicate for Waiting-for-Requester tickets and other open tickets with a requester-resolution indication, ordered globally by `updatedAt DESC, ticketNumber DESC` with `take: 5`.<br><br>I added a regression fixture with five older Waiting tickets and a newer indicated ticket. The API test verifies that the indicated ticket appears in the response and the oldest Waiting ticket is omitted. I also aligned BR-12 and the API contract with this global top-five ordering.<br><br>Verification passed: `npm.cmd test -- --run tests/lab-04/requester-dashboard.api.test.ts` (2 tests) and `npx.cmd tsc --noEmit`. |
| **Review Comment (2) — Follow-up approval** | Re-reviewed the dashboard follow-up. The attention query now uses one combined predicate with a single global ordering and limit, and the regression case verifies that a newer requester-indicated ticket appears ahead of older waiting tickets. The BR-12 and API-contract wording now matches the implementation. No blocking issues found. |
| **My Response (2)** | Thank for review. you can merge. |
| **Outcome** | Changes requested on 2026-10-05 04:34:23 UTC; follow-up approved on 2026-10-05 16:11:44 UTC and merged on 2026-10-05 16:12 UTC. [Follow-up response](https://github.com/THN4/toktickit/pull/59#issuecomment-5998138465); [review acknowledgment](https://github.com/THN4/toktickit/pull/59#issuecomment-5998381955). |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-59.png`. |

---

### PR 6 — feature/6-lab4-regression-hardening → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#60](https://github.com/THN4/toktickit/pull/60) |
| **Reviewer** | Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) |
| **Review Comment** | Reviewed the Lab 4 hardening changes. The accessibility improvements correctly associate labels and errors, preserve dialog keyboard handling, and restore focus safely when the originating completion button is removed. The responsive checks, safe-failure coverage, real browser flows, and evidence documentation are appropriately scoped. The unavailable PostgreSQL/Docker rerun is transparently recorded as pending rather than claimed as a pass. No blocking issues found. |
| **My Response** | Thank for review Kittithat, you can merge now. |
| **Outcome** | Approved and merged on 2026-10-06. Review submitted at 2026-10-06 05:47:48 UTC. [PR discussion comment](https://github.com/THN4/toktickit/pull/60#issuecomment-6010232991). |
| **Screenshot Evidence** | Not captured; no browser session was available. Intended path: `docs/lab-04/evidence/reviews/pr-60.png`. |

---

## Pull Requests I Reviewed for My Partner

> I reviewed the following Lab 4 PRs submitted by Kittithat Disthanakornkun ([@JeffMerry](https://github.com/JeffMerry)) in [JeffMerry/toktickit](https://github.com/JeffMerry/toktickit). Review submissions and direct response text are recorded; repeated quoted review text is omitted.

### PR A — feature/19-lab4-spec-docs → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#48](https://github.com/JeffMerry/toktickit/pull/48) |
| **My Review Comment — Approved (2026-09-29 17:13:53 UTC)** | Approved. The Lab 4 contract covers the required Actions Taken model, Ticket workflow, dashboards, API and UI behavior, migration and regression strategy, and acceptance-test traceability. The remaining details around the definition of active and recent dashboard metrics, and the related test-plan coverage, can be clarified as implementation proceeds and do not block this documentation PR. |
| **Partner's Response (2026-09-29 17:16:00 UTC)** | Thankyou champ for review.you can merge now. |
| **Outcome** | Approved and merged on 2026-09-29 17:16:51 UTC. |

---

### PR B — feature/20-lab4-actions-api → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#49](https://github.com/JeffMerry/toktickit/pull/49) |
| **My Review Comment (1) — Changes requested (2026-10-01 08:33:47 UTC)** | 1. The seed deletes every ActionTaken attached to the seeded demo Tickets before recreating the fixtures. Because ActionTakenEvent rows cascade on deletion, rerunning the seed also erases audit history and any Actions that users added to those Tickets. Please make the seed update/delete only its own identifiable fixtures, or otherwise ensure and clearly document that it can only run against a disposable development database.<br><br>2. Please add API test coverage for the `CANCELLED` transition. The implementation exposes this lifecycle transition, but the current test exercises creation, assignment rejection, editing, starting, stale-update rejection, and completion without testing cancellation or its terminal behavior. |
| **Partner's Response (1) — Follow-up (2026-10-01 09:14:04 UTC)** | Thanks for the review. Both points have been addressed.<br><br>1. The seed now identifies only its own Lab 4 fixtures with a stable `seedKey` and upserts them, so it no longer deletes user-created Actions Taken or their audit history. Additive migrations also backfill fixtures created by the earlier seed implementation.<br><br>2. Added regression coverage for the `CANCELLED` transition and verified that a cancelled Action Taken cannot transition again.<br><br>Validation: server test suite passes (53 tests). |
| **My Review Comment (2) — Approved (2026-10-01 09:23:17 UTC)** | Thanks for addressing both review points. The seed now uses stable seed keys and upserts only its own fixtures, preserving user-created Actions Taken and their audit events. The API test now covers cancellation and confirms that a cancelled Action cannot transition again. I verified these changes in the latest PR head. The server test suite is reported as passing (53 tests). |
| **Partner's Response (2) (2026-10-01 09:24:25 UTC)** | Thanks for review Champ. you can merge now. |
| **Outcome** | Changes requested, then approved and merged on 2026-10-01 09:24:55 UTC. |

---

### PR C — feature/21-lab4-actions-ui → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#50](https://github.com/JeffMerry/toktickit/pull/50) |
| **My Review Comment (1) — Changes requested (2026-10-02 15:43:09 UTC)** | Please address these two issues in `client/src/components/ActionsTaken.tsx`:<br><br>1. **Conflict reload may overwrite newer data.** `reloadEditing` refreshes the action’s `updatedAt` but leaves the form fields unchanged. Submitting afterward can save stale values using the latest timestamp, overwriting another user’s changes without triggering another conflict. Please reload the latest values into the form, or require the user to explicitly choose how to handle the draft before retrying.<br><br>2. **Retry does not recover from an assignee loading failure.** If `/api/staff/action-assignees` fails, the error hides the Actions list, but the Retry button reloads only Actions. Please separate the assignee error and retry flow, or make Retry reload both Actions and assignees. |
| **Partner's Response (1) — Follow-up (2026-10-02 15:55:21 UTC)** | Thanks for the review. Both issues have been addressed.<br><br>1. Conflict reload now replaces the edit form with the latest server values before retrying, so a stale draft cannot be submitted with a refreshed timestamp.<br><br>2. Assignee lookup errors are now handled separately from the Actions list. Existing Actions remain visible, and the UI provides a dedicated assignee lookup retry action. The general retry path also refreshes both Actions and assignees.<br><br>Validation: `npm --prefix client test` passes (17 tests), and `npm --prefix client run build` passes. |
| **My Review Comment (2) — Approved (2026-10-02 16:00:07 UTC)** | The previously identified issues have been addressed. Conflict reload now updates the form with the latest action values, and assignee lookup failures can be retried without hiding the Actions list. Tests have been added for both cases. Approved. |
| **Partner's Response (2) (2026-10-02 16:23:52 UTC)** | Thanks Champ for review. you can merge now. |
| **Outcome** | Changes requested, then approved and merged on 2026-10-02 16:24:34 UTC. |

---

### PR D — feature/22-lab4-ticket-workflow → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#51](https://github.com/JeffMerry/toktickit/pull/51) |
| **My Review Comment (1) — Changes requested (2026-10-04 07:27:41 UTC)** | The handler checks the Action Taken records before updating the Ticket status. An Action could be changed after this check but before the Ticket update; since Action updates do not change the Ticket’s updatedAt, the status update may still succeed using stale Action data. This could allow a Ticket to be resolved even though it no longer meets the resolution gate.<br><br>Please make the gate check and status update safe from concurrent Action changes, and add a regression test for this case. |
| **Partner's Response (1) — Follow-up (2026-10-04 08:09:20 UTC)** | Fixed in `6491819`.<br><br>Action create, edit, and status mutations now refresh the parent Ticket `updatedAt` in the same transaction. A workflow request using the Ticket timestamp read before an Action change now receives `409 Conflict`, and reloading then evaluates the resolution gate against current Action data.<br><br>Added regression coverage for this stale resolution scenario. Server suite: 16 files, 57 tests passed. |
| **My Review Comment (2) — Approved (2026-10-04 08:12:11 UTC)** | The resolution gate issue has been addressed. Action Taken creation, edits, and status changes now update the parent Ticket’s updatedAt in the same transaction. A regression test confirms that a resolution request using a stale Ticket timestamp is rejected after an Action changes. Approved. |
| **Partner's Response (2) (2026-10-04 08:12:52 UTC)** | Thank you Champ, You can merge now. |
| **Outcome** | Changes requested, then approved and merged on 2026-10-04 08:13:55 UTC. |

---

### PR E — feature/23-lab4-dashboards → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#52](https://github.com/JeffMerry/toktickit/pull/52) |
| **My Review Comment — Approved (2026-10-06 06:39:35 UTC)** | The dashboard implementation aligns with the approved specification: requester data is scoped to the authenticated user, metrics are calculated server-side, and dashboard items link to the appropriate ticket views. The API documentation examples for the “My Owned” and “Urgent Active” filters could be clarified, but the implementation returns supported filters. Approved. |
| **Partner's Response (2026-10-06 06:51:31 UTC)** | Thank Champ for review, you can merge now. |
| **Outcome** | Approved and merged on 2026-10-06 06:52:24 UTC. |

---

### PR F — feature/24-lab4-final-verification → lab4-staging

| Field | Detail |
|---|---|
| **PR Link** | [#53](https://github.com/JeffMerry/toktickit/pull/53) |
| **My Review Comment — Approved (2026-10-06 09:11:41 UTC)** | The feature-branch verification looks good. The Action form now closes after a successful save, Ticket details refresh after Action changes, and the 320px Staff Ticket Detail layout no longer overflows. The documented server, client, browser, and screenshot checks passed.<br><br>Approved. Before the final Lab 4 release, please complete the documented Lab 3 database migration check, manual keyboard/focus review, and verification on the integrated lab4-staging branch. |
| **Partner's Response (2026-10-06 09:12:21 UTC)** | Thank Champ for review.you can merge now. |
| **Outcome** | Approved and merged on 2026-10-06 09:13:20 UTC. |

---

## Release Review Checklist

- [ ] Reviewer verified Actions authorization and actor attribution.
- [ ] Reviewer verified the resolution gate and transition matrix.
- [ ] Reviewer compared dashboard counts with database predicates and checked ownership.
- [ ] Reviewer checked migration/regression, responsive/accessibility evidence, and test-status accuracy.
- [ ] Screenshots of each reviewed PR have been captured and saved under `docs/lab-04/evidence/reviews/`.

## Release Integration Status (2026-10-06)

- PRs #55–#60 are the reviewed feature/documentation PRs merged into `lab4-staging`.
- Issue #54 / `feature/7-lab4-release-evidence` is the release-evidence branch. [PR #61](https://github.com/THN4/toktickit/pull/61) to `lab4-staging` is open, and review has been requested from [@JeffMerry](https://github.com/JeffMerry). Do not describe it as reviewed or merged until the review and merge occur.
- A release PR from `lab4-staging` to `main`, its final tests, and the actual Project/Kanban completion statuses remain pending. Do not claim the board is Done without verifying it.
- The peer reviewer name and student ID above match the Lab 3 peer-review record; confirm them before submission if the course reviewer assignment changed.
