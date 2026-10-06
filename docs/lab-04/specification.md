# Lab 4 Sprint Engineering Specification

> **Status:** Reviewed before implementation; approved engineering baseline for Lab 4. The contract was included in [PR #55](https://github.com/THN4/toktickit/pull/55) before the implementation PRs. Changes and review outcomes are recorded in [reviewer.md](reviewer.md).
> **Last updated:** 2026-10-06
> **References:** [Lab 4 handout](SE+Lab+4.md), Lab 3 contracts.

## 1. Sprint Goal

Complete TokTickIT's service-desk workflow by recording staff work as multiple Actions Taken per Ticket, applying a controlled resolution workflow, and giving Requesters and staff concise role-specific dashboards, while preserving Labs 1–3 behavior and the Zen Green interface.

## 2. Stakeholder Request

IT Staff need an auditable work log under each Ticket, distinct from comments and private notes. The Ticket Owner coordinates the case, while another authorized staff member may perform and record work. A Requester's “appears resolved” signal remains advisory; IT Staff formally resolve the Ticket. Dashboards summarize existing records and link to detail.

## 3. Scope

### Included
- Actions Taken create, list, and update on accessible Tickets, including date/time, description, result, auto-attributed performer, follow-up flag/note, and attachment notes.
- Complete server-enforced status transitions, resolution gate, and safe stale/concurrent-update handling.
- Requester, IT Staff, and Administrator dashboard data and responsive screens.
- Non-destructive Prisma migration, backfill policy, idempotent representative seed, REST API, tests, accessibility, regression and final hardening.
- Preserve authentication, ownership, user management, Tickets, comments, internal notes, and attachments from earlier labs.

### Explicitly excluded
- SLA clocks, escalation/on-call/breach notifications; email, SMS, LINE, push, or any external notifications.
- Inventory, parts, purchasing, service cost accounting, time-sheet billing, payroll, or labor-cost calculations.
- Multi-level approval/signatures; BI/report builders/export warehouse; multi-tenant or production-scale cloud operations.
- Unapproved features. Do not expand this sprint into these areas.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | IT Staff and Administrators can list Actions Taken for an accessible Ticket and create/update an Action Taken; Requesters can read actions only on their owned Tickets. |
| FR-02 | Staff can assign an Action Taken to an active IT Staff user, start, complete, or cancel it; the server derives creator and actual performer from the authenticated session and rejects client-supplied actor identity. |
| FR-03 | Action Taken has one Ticket, action date/time, non-empty description, result required on completion, optional assignee, server-attributed performer, follow-up-required flag and conditional note, attachment notes, status, and audit timestamps. |
| FR-04 | The server enforces a documented status-transition matrix and resolution prerequisites for every write path. Requester resolution indication never changes formal status. |
| FR-05 | Requester dashboard returns only that Requester's metric summaries and a short recent/attention list; each item drills into owned Ticket detail/list. |
| FR-06 | IT Staff and Administrator dashboard returns documented operational metrics and recent/urgent Tickets, with links to Queue or filtered Queue. |
| FR-07 | Dashboard values are calculated by backend queries over authoritative data; zero-result behavior and date boundaries are stable and documented. |
| FR-08 | Migrations preserve all existing Lab 1–3 records; old Tickets without actions remain valid. Seeds are repeatable and cover dashboard zero/non-zero and workflow cases. |
| FR-09 | Existing authentication, authorization, Requester, staff, admin, comments, notes, and attachment behavior continues to pass regression coverage. |
| FR-10 | UI provides role-specific navigation, responsive Zen Green screens, accessible status cues and consistent loading/empty/error/conflict feedback. |
| FR-11 | Creating an Action Taken is safe against repeated clicks and retries; creation, edits and status changes retain append-only audit events. |

## 5. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Each Action Taken belongs to exactly one Ticket; a Ticket has zero or more actions. Deleting a Ticket/action is not introduced by this sprint. |
| BR-02 | Ticket has at most one primary owner. Owner coordinates the Ticket; action performer is independently derived from the authenticated IT Staff/Administrator making that action. |
| BR-03 | Only IT Staff and Administrator may create/update actions. Requesters may read actions only for their owned Tickets. Backend checks every operation; hidden controls are not authorization. |
| BR-04 | `actionAt` is required ISO-8601 with offset at the API boundary, stored/returned as UTC. It is the planned action time until completion and the recorded work time on completion. Planned times may be future; a completed action time cannot be more than five minutes in the future. The UI defaults to the current time. |
| BR-05 | Description is trimmed, non-blank plain text (1–2,000 characters). Result is optional before completion and required, trimmed, non-blank plain text (1–2,000 characters) on completion. Follow-up note is required when `followUpRequired=true` and limited to 2,000 characters; clearing the flag retains an existing note for audit context. Attachment notes are optional plain text (≤1,000 characters) describing files to locate; this field does not upload/manage files. |
| BR-06 | `createdById` and `performedById` come from the authenticated session; performer and server `completedAt` are null until completion, then set from the completing user/current server time. Ticket relationship, creator, performer, audit times, and version cannot be spoofed or edited. A planned action displays “Not yet performed” rather than a false performer. |
| BR-07 | Action status matrix: `PLANNED→IN_PROGRESS|COMPLETED|CANCELLED`; `IN_PROGRESS→COMPLETED|CANCELLED`; `COMPLETED` and `CANCELLED` are terminal. Staff may edit content/assignee on non-terminal actions and correct content on completed actions with version checks, but cannot change a terminal status or delete an action. Every create/edit/status change appends an audit event with actor, time, event type, and prior/new values; Public Comments and Internal Notes remain append-only. |
| BR-08 | Ticket statuses remain `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`. Transition matrix and role control are defined in this contract and API/UI specs; backend is authoritative. |
| BR-09 | Final transition matrix (IT Staff/Administrator only): `NEW→OPEN|CANCELLED`; `OPEN→IN_PROGRESS|WAITING_FOR_REQUESTER|CANCELLED`; `IN_PROGRESS→WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`; `WAITING_FOR_REQUESTER→IN_PROGRESS|CANCELLED`; `RESOLVED→CLOSED|REOPENED`; `CLOSED→REOPENED`; `REOPENED→OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|CANCELLED`; `CANCELLED→REOPENED`. Same-state updates are rejected. |
| BR-10 | Moving a Ticket to `RESOLVED` requires at least one `COMPLETED` action with a non-blank result, no `PLANNED`/`IN_PROGRESS` action, and no non-cancelled action still marked as requiring follow-up. Cancelled actions remain in history but do not block resolution. `CLOSED` requires current Ticket status `RESOLVED`. Explicit confirmation is required for Ticket `RESOLVED`, `CLOSED`, and `CANCELLED`. Requester indication is advisory only. |
| BR-11 | Primary Ticket owner and Action Taken assignee must each be an active IT Staff user or null. An Administrator may create/manage an action but cannot be its assignee/primary Ticket owner; owner, assignee, creator, and performer may differ. Inactive/Requester assignees are rejected by the backend. |
| BR-12 | Requester dashboard is scoped by session owner: open = current statuses except `RESOLVED`, `CLOSED`, `CANCELLED`; waiting = `WAITING_FOR_REQUESTER`; recently updated = Tickets with `updatedAt` in the previous 30 days; recently resolved = Tickets currently `RESOLVED` with `resolvedAt` in the previous 30 days. Recent and attention lists show the globally newest five by `updatedAt DESC, ticketNumber DESC`; resolved list uses `resolvedAt DESC, ticketNumber DESC`. Attention candidates combine waiting Tickets and other open Tickets with a Requester-resolution indication before applying the five-item limit. |
| BR-13 | Staff dashboard includes unassigned non-terminal Tickets; non-terminal Tickets owned by current IT Staff; counts by each Ticket status (all Tickets) and IT Priority (non-terminal Tickets); recently updated Tickets; and current user's non-terminal assigned Actions Taken plus recent completed Actions Taken. Admin uses the same operational dashboard and may see concise user-account counts; “my owned/assigned” is zero for an Admin because only IT Staff can own/receive assignments. |
| BR-14 | Dashboard timezone is UTC; rolling 30 days means `[request time - 30×24h, request time]`. Empty collections are `[]`; every count is integer 0, never null. Metrics are summaries, not full Ticket collections. |
| BR-15 | All dashboard drill-downs preserve authorization. My Tickets and staff Queue must initialize supported filters from dashboard URL query parameters; unknown/invalid query values are safely ignored or rejected as documented. Requester detail/list never exposes other users' Ticket data. |
| BR-16 | Concurrent action and Ticket workflow writes (claim, owner, IT Priority and status) use integer `version` and required `expectedVersion`; mismatch returns 409 without overwriting newer state. Action create requires a unique `clientRequestId`; replay with the same actor/Ticket/payload returns the existing action, while reuse with different content returns 409. |
| BR-17 | Existing Tickets without actions remain valid; no synthetic action is backfilled. Add nullable `resolvedAt`; legacy Resolved/Closed Tickets retain null if true resolution time is unknown, so “recently resolved” excludes them rather than fabricating dates. Existing records are not silently rewritten; new transitions must meet BR-10. |
| BR-18 | Attachment Notes are descriptive metadata only. Actual attachment authorization, upload, download, and deletion continue to follow Lab 2/3 rules. |
| BR-19 | IDs, role, ownership, actor, calculated metrics and audit timestamps are never trusted from the client; user-entered `actionAt` is validated separately. Responses never disclose stack traces, secrets, private notes to Requesters, or another Requester's Ticket existence. |
| BR-20 | Lab 4 extends Administrator access to the approved staff Ticket Queue/Detail, action and status operations while retaining User Management; existing Requester ownership and private-note visibility stay protected. |
| BR-21 | `Ticket.updatedAt` is advanced by action create/update/status changes so recent Ticket activity includes Lab 4 work; dashboard metrics use this authoritative value. All count/list queries include legacy Tickets, subject to BR-17 for `resolvedAt`. |

### Authorization matrix

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Read actions on Ticket | Owned Ticket | All Tickets | All Tickets |
| Create/edit/assign/complete/cancel actions | No | All Tickets | All Tickets |
| Requester dashboard | Own data | No | No |
| Staff dashboard | No | Yes | Yes (same staff metrics; optional account counts) |
| Formal status transition | No | Yes | Yes |
| Staff Ticket Queue/Detail | No | Yes | Yes |
| Public Comments / Internal Notes | Owned public only / no notes | Lab 3 permissions | Lab 3 read-only permissions |
| Administrator User Management | No | No | Yes |

## 6. UI Specification Summary

See [ui-spec.md](ui-spec.md). Add dashboard links in the role shell; preserve Lab 3 screens. Action Taken detail has list/create/edit modes, read-only performer/created time, inline conditional follow-up note, validation and conflict recovery. Staff dashboard emphasizes operational queue and current-user work; Requester dashboard emphasizes attention, recent updates and resolved Tickets. Cards drill into existing detailed screens. Responsive, keyboard-operable layouts use text-labelled status/priority cues.

## 7. Data Changes

### 7.1 Proposed model

`ActionTaken`: `id` (Int auto-increment, matching existing models), `ticketId` (required FK Ticket), `clientRequestId` (UUID string, unique per creator/Ticket), `actionAt` (DateTime/timestamptz), `description`, nullable `result`, `status` (`PLANNED|IN_PROGRESS|COMPLETED|CANCELLED`), nullable `assigneeId` (FK User), `createdById` (FK User), nullable `performedById` (FK User), nullable `completedAt` (server timestamp), `followUpRequired` (boolean), nullable `followUpNote`/`attachmentNotes`, `version` (Int default 1), `createdAt`, `updatedAt`. `ActionTakenEvent`: append-only `id`, `actionTakenId`, `actorId`, `eventType`, prior/new JSON summary, `createdAt`. Ticket gains integer `version` and nullable `resolvedAt`. Existing User/Ticket/Attachment/Comment/Note IDs remain unchanged.

### 7.2 Indexes and design decisions

- Index `(ticketId, actionAt, id)` for stable detail ordering; `(assigneeId, status, updatedAt)` and `(performedById, completedAt)` for current-user lists; unique `(createdById, ticketId, clientRequestId)` for retry safety; `(actionTakenId, createdAt, id)` for event order. Ticket dashboard indexes add `(requesterId, updatedAt)`, `(currentStatus, resolvedAt)`, `(ticketOwnerId, currentStatus, updatedAt)` alongside existing indexes.
- Decision 1: use a child table instead of embedding action arrays so actions can be independently validated, edited, attributed, indexed and migrated.
- Decision 2: preserve both business `actionAt` and audit `createdAt/updatedAt`; user-entered event time must not replace system audit time.
- Decision 3: integer optimistic version catches stale edits without locking a Ticket during normal reads; append-only events preserve what changed when editable action records are corrected.

### 7.3 Migration, recovery, seed

Add ActionTaken, ActionTakenEvent, indexes, Ticket.version default 1, and nullable Ticket.resolvedAt in a forward-only Prisma migration. Preserve existing IDs, tables, foreign keys, owner/Requester relationships, and priority enum (`LOW|MEDIUM|HIGH`); no data-reset migration. Existing Tickets get zero actions and version 1; legacy `resolvedAt` stays null. Check row counts/FKs and dashboard treatment before/after migration on a copy of Lab 3 data and a clean database. Recovery is database backup restore or corrective forward migration; do not delete newly recorded work as a rollback shortcut. Seed uses upsert/stable IDs and covers all Ticket statuses/priorities, owned/unowned Tickets, zero/one/multiple actions, all action statuses, active/inactive assignee cases, and zero/non-zero metrics.

## 8. API Contract Summary

Full shapes and failures: [api-spec.md](api-spec.md). Endpoints under `/api`: `GET /requester/dashboard`, `GET /staff/dashboard`, `GET /tickets/:ticketNumber/actions`, `GET /staff/action-assignees`, `POST /staff/tickets/:ticketNumber/actions`, `PATCH /staff/actions/:id`, `PATCH /staff/actions/:id/status`, and existing staff Ticket status route with version precondition. Dashboard responses contain counts and short lists, not full Ticket collections. Preserve the implemented `{success,data}` / `{success:false,error}` envelopes and all approved Lab 2/3 endpoints.

## 9. Acceptance Criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | Given an accessible Ticket and valid action, when IT Staff creates it, then it is attached to exactly that Ticket with authenticated performer and server timestamps. |
| AC-02 | Given an action whose performer differs from Ticket owner, when saved by authorized staff, then both identities remain correct. |
| AC-03 | Given invalid fields or follow-up required without a note, when create/update is attempted, then field validation rejects without persistence. |
| AC-04 | Given a Requester, when actions are read on their Ticket, then actions are visible; when they create/update or read another user's actions, then access is denied safely. |
| AC-05 | Given stale `expectedVersion`, when an action is updated, then API returns 409 and current data remains unchanged. |
| AC-06 | Given a Ticket with no completed action/result, unfinished action or outstanding non-cancelled follow-up, when staff attempts resolution, then backend rejects it; after prerequisites are met it permits a valid transition. |
| AC-07 | Given Requester clicks “appears resolved”, when indication is saved, then formal Ticket status is unchanged. |
| AC-08 | Given any current status, when a role requests a transition, then only matrix edges and permitted roles succeed. |
| AC-09 | Given a Requester dashboard request, when data is returned, then every count/list item is scoped to session owner and zero metrics are represented as 0. |
| AC-10 | Given a staff dashboard request, when data is returned, then counts match documented database predicates and each drill-down opens the corresponding Queue filter/detail. |
| AC-11 | Given no matching recent records, when dashboard loads, then empty lists and zero counts render with useful empty states and no broken links. |
| AC-12 | Given existing Lab 1–3 data, when migration runs, then old records and relationships remain intact and legacy tickets have zero actions. |
| AC-13 | Given repeated seed execution, when run twice, then the same deterministic fixture records exist without duplicates. |
| AC-14 | Given supported desktop/tablet/mobile sizes and keyboard-only use, when major Lab 4 screens are used, then content is readable, operable and has no clipped controls or page-level horizontal overflow. |
| AC-15 | Given the full Lab 1–3 regression suite, when run against Lab 4 increment, then authentication, authorization, tickets, users, comments, notes and attachments retain approved behavior. |
| AC-16 | Given a permitted staff member, when an action is assigned to an inactive/non-staff user, then backend rejects it; a valid assignee different from owner/performer is accepted. |
| AC-17 | Given an action in PLANNED or IN_PROGRESS, when permitted staff starts, completes, or cancels it, then only the action matrix succeeds; Completed requires Result and auto-records performer. |
| AC-18 | Given a repeated create request with the same clientRequestId, when the payload matches, then only one action exists; a mismatched retry gets 409. |
| AC-19 | Given action edits and workflow changes, when records are read, then stable ordering and append-only audit events remain intact; Public Comments/Internal Notes stay append-only. |
| AC-20 | Given an Administrator, when staff operational views/actions are used, then the approved Lab 4 permissions work while User Management and private-content protections remain valid. |
| AC-21 | Given the final application, when health, validation, not-found, conflict, and safe API-failure paths are exercised, then no sensitive details leak and entered form data survives recoverable errors. |

## 10. Product Definition of Done

- [ ] Contract files reviewed and internally consistent before implementation PRs.
- [ ] Migration preserves Lab 1–3 data; recovery/backfill and idempotent seed verified.
- [ ] Every AC maps to planned and passing tests, including action assignment/lifecycle, retry safety, audit ordering, admin permissions, health/safe failure; API authorization is server-enforced.
- [ ] Actions, workflow gates, dashboards, calculations, drill-downs and stale-write handling meet this contract.
- [ ] Prior features pass regression; no severe console errors, broken links, placeholders, or unfinished controls.
- [ ] Zen Green/accessibility checklist and desktop, tablet, mobile evidence completed.
- [ ] README setup, migration, seed, test and demo guidance is current; reviewer and AI-use records reflect actual work.
- [ ] Final branch contains merged reviewed work, all Issues Done, required test output and one concise PDF with Answer Part 1–9 in exact order.

## 11. Assumptions and Decisions

Choices not fixed by the handout were resolved in the reviewed contract before implementation: an Action Taken can be planned/assigned before work, so `performedById` is null until completion and then server-derived; corrections are versioned and audited, while cancellation never deletes history. Resolution requires completed work and no pending action/follow-up. Dashboards use UTC, rolling 30-day windows, five-item lists, and nullable true resolution time. Stale writes return 409. The team reviewed these choices in PR #55. No excluded feature may be added without explicit contract approval.
