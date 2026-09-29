# Lab 4 REST API Contract

> **Status:** Draft for peer review. Paths below omit the common `/api` prefix. Existing Lab 2/3 endpoints remain unless explicitly extended here.

## 1. Conventions, authorization and errors

Use the existing session cookie, password-change guard and same-origin check for every write. Successful responses keep the implemented `{ "success": true, "data": ... }` envelope; failures keep `{ "success": false, "error": { "code": "...", "message": "...", "field": "..." } }` where `field` is optional. Never expose stack traces, SQL errors, secrets, another Requester's Ticket existence, or Internal Notes to Requesters.

| Status | Meaning |
|---|---|
| 200 | Read/update or exact idempotent create replay |
| 201 | New Action Taken created |
| 400 | Invalid field, query or confirmation |
| 401 | No valid session |
| 403 | Authenticated but forbidden or password change required |
| 404 | Missing or non-owned Ticket/action without existence disclosure |
| 409 | Stale version, invalid transition, unmet resolution gate or idempotency-key reuse with different payload |
| 500 | Safe generic failure |

An active `REQUESTER` reads actions only under their owned Ticket; `IT_STAFF` and `ADMINISTRATOR` read/manage actions across Tickets. Lab 4 extends the existing staff Queue/Detail/status endpoints to Administrator, while preserving Administrator-only User Management and the Lab 3 Public Comment/Internal Note permissions. Backend role/ownership checks are required on every route.

## 2. Actions Taken

| Method | Path | Roles | Success |
|---|---|---|---|
| GET | `/tickets/:ticketNumber/actions` | Owner Requester, IT Staff, Administrator | 200; `{success:true,data:{items:[Action...]}}`, `actionAt ASC,id ASC` |
| GET | `/staff/action-assignees` | IT Staff, Administrator | 200; active IT Staff `{id,name}` only |
| POST | `/staff/tickets/:ticketNumber/actions` | IT Staff, Administrator | 201 new Action; 200 exact retry |
| PATCH | `/staff/actions/:id` | IT Staff, Administrator | 200 updated Action |
| PATCH | `/staff/actions/:id/status` | IT Staff, Administrator | 200 updated Action |

Create body:

```json
{
  "clientRequestId": "d6f2bb4d-2e2d-4f74-9eca-991e2cad7fe5",
  "actionAt": "2026-09-29T10:30:00+07:00",
  "description": "Check the application service",
  "result": null,
  "assigneeId": 12,
  "followUpRequired": true,
  "followUpNote": "Verify again after restart",
  "attachmentNotes": "See service-restart.png"
}
```

Create starts at `PLANNED`; `assigneeId` may be null or an active IT Staff ID. Creator is the session user; performer and completedAt are null until `COMPLETED`. `clientRequestId` is required for retry safety and unique within creator+Ticket. A replay with the same normalized fields returns the same Action with 200; reuse with different fields returns 409 `IDEMPOTENCY_CONFLICT`. No client field may set Ticket ID, creator, performer, status, audit time or version.

Edit body is a subset of editable fields `{actionAt,description,result,assigneeId,followUpRequired,followUpNote,attachmentNotes}` plus required `expectedVersion`. Absent editable fields are unchanged; `assigneeId:null` unassigns a non-terminal action. Non-terminal actions may edit all these fields. Completed actions may correct description/result/follow-up/attachment notes and actionAt, but cannot change assignee/status/performer; Cancelled actions are read-only. An assignee must be active `IT_STAFF`; inactive users, Requesters and Administrators are rejected with field-specific 400. Follow-up note is required whenever the flag is true and limited to 2,000 characters; clearing the flag retains an existing note. Description length is 1–2,000, Result length 1–2,000 when present, Attachment Notes max 1,000. `actionAt` is ISO-8601 with offset; completed time cannot be more than five minutes in the future.

Status body: `{ "status":"IN_PROGRESS", "expectedVersion":1 }` or `{ "status":"COMPLETED", "expectedVersion":2, "result":"Service restored", "actionAt":"2026-09-29T10:45:00+07:00" }`. Allowed edges: `PLANNED→IN_PROGRESS|COMPLETED|CANCELLED`, `IN_PROGRESS→COMPLETED|CANCELLED`. Completing requires a non-blank Result and records `performedById` and `completedAt` from the authenticated user/server clock. Terminal actions cannot transition again. Cancellation retains the record and audit history. Reject invalid edges with 409 `INVALID_ACTION_TRANSITION`, missing Result with 400 `VALIDATION_ERROR`.

Action response `data` contains `{id,ticketNumber,actionAt,description,result,status,assignee:{id,name}|null,createdBy:{id,name},performedBy:{id,name}|null,completedAt,followUpRequired,followUpNote,attachmentNotes,version,createdAt,updatedAt}`. Dates are UTC ISO strings; ID fields are integers, matching existing Prisma models. `GET` returns all actions for an authorized Ticket, including cancelled actions. Each create/edit/status change appends an `ActionTakenEvent`; no action delete endpoint exists. Mismatched `expectedVersion` returns 409 `STALE_VERSION` without overwriting current data.

## 3. Ticket workflow and preserved APIs

Existing `PATCH /staff/tickets/:ticketNumber/status` gains required `expectedVersion`, e.g. `{ "status":"RESOLVED", "confirmed":true, "expectedVersion":7 }`. `POST /staff/tickets/:ticketNumber/claim` and `PATCH /staff/tickets/:ticketNumber/owner` / `it-priority` also require `expectedVersion` in their JSON bodies. Claim remains conditional on a null owner. All these writes advance Ticket.version atomically and return the updated Ticket; stale writes return 409 `STALE_VERSION`. The backend enforces specification BR-09 and BR-10 in a transaction with the version precondition. `RESOLVED` requires a Completed Action with a Result, no Planned/In Progress action, and no non-cancelled action with `followUpRequired=true`. Cancelled actions remain visible but do not block resolution. `CLOSED` requires current status Resolved. `confirmed:true` is required for Resolved/Closed/Cancelled. Return the updated Ticket in the existing `{success:true,data:ticket}` envelope with `version`, `resolvedAt` and `updatedAt`; other 409 codes are `INVALID_STATUS_TRANSITION` or `RESOLUTION_PREREQUISITE` as appropriate. Set `resolvedAt` on entry to Resolved; clear it on Reopened. Legacy Resolved/Closed Tickets retain null when actual resolution time is unknown.

The Requester `POST /tickets/:ticketNumber/requester-resolution` remains advisory and never changes `currentStatus`. Existing authentication, health, Requester Ticket/Attachment, staff Queue/Detail/claim/owner/priority, Public Comment/Internal Note, and Administrator User APIs keep their established routes and safe envelopes. Lab 4 must revise staff guards where Administrator operational access is approved; it must not broaden Requester ownership or Administrator comment/note writing. Existing Queue filters remain `status`, `requestedPriority`, `itPriority`, `ownerState`, `ownerId`, search, sort and pagination.

## 4. Dashboards

All calculations use server data and UTC. A rolling 30-day window is `[request timestamp − 30×24h, request timestamp]`. Counts are non-negative integers; empty lists are `[]`. Return summary fields only, never full Ticket collections.

### Requester: `GET /requester/dashboard`

Requires `REQUESTER`, scoped by session user ID. No query parameters. `data` has `metrics:{openTickets,waitingForRequester,recentlyUpdated,recentlyResolved}`, `attentionTickets`, `recentTickets`, `recentlyResolvedTickets` (each at most five summaries). Example empty data: `{ "metrics":{"openTickets":0,"waitingForRequester":0,"recentlyUpdated":0,"recentlyResolved":0}, "attentionTickets":[], "recentTickets":[], "recentlyResolvedTickets":[] }`. Open excludes current `RESOLVED`, `CLOSED`, `CANCELLED`; waiting matches `WAITING_FOR_REQUESTER`; recently updated uses Ticket.updatedAt; recently resolved uses current `RESOLVED` and non-null `resolvedAt` in the 30-day window. Attention list contains waiting Tickets first and then other open Tickets with a Requester-resolution indication; deduplicate and sort within each group by `updatedAt DESC,ticketNumber DESC`. Recent list sorts by `updatedAt DESC,ticketNumber DESC`; resolved list by `resolvedAt DESC,ticketNumber DESC`. Legacy `resolvedAt=null` is excluded only from the resolved-time metric/list.

Each summary is `{ticketNumber,summary,currentStatus,itPriority,updatedAt,resolvedAt,requesterResolvedAt}`. Drill-down: waiting/resolved cards → `/my-tickets?status=WAITING_FOR_REQUESTER` / `?status=RESOLVED`; open/recently-updated cards → `/my-tickets` with a clear aggregate label; summaries → `/tickets/:ticketNumber`. My Tickets currently stores filters only in component state, so the Lab 4 client must initialize its status filter from the URL for those links to work. The open/recent counts aggregate multiple statuses/times and do not claim a single filter reproduces them.

### Staff/Admin: `GET /staff/dashboard`

Requires `IT_STAFF` or `ADMINISTRATOR`; no query parameters. `data.metrics` contains `unassignedTickets`, `myOwnedTickets`, `byStatus` (all eight statuses, including zero), `byItPriority` (`LOW|MEDIUM|HIGH` for non-terminal Tickets, including zero), `recentlyUpdated` (30-day Ticket.updatedAt count), `myAssignedActions` (current user's `PLANNED|IN_PROGRESS` assigned actions), and `myCompletedActions30d` (actions performed by current user, status `COMPLETED`, server completedAt in 30 days). `data` also contains `recentTickets`, `highPriorityTickets`, `myAssignedActionItems`, `recentMyCompletedActions` (each ≤5). Empty metric objects have all known keys with value 0, for example `byStatus:{NEW:0,OPEN:0,IN_PROGRESS:0,WAITING_FOR_REQUESTER:0,RESOLVED:0,CLOSED:0,REOPENED:0,CANCELLED:0}` and `byItPriority:{LOW:0,MEDIUM:0,HIGH:0}`. Recent Tickets use Ticket.updatedAt in 30 days; high priority uses `HIGH` and excludes terminal Tickets. Assigned list uses current assignee and non-terminal status; completed list uses current performer and completedAt. Lists sort `updatedAt DESC,ticketNumber DESC` (actions: `updatedAt DESC,id DESC`). Admin's myOwned/myAssigned values are zero by rule because only IT Staff can own/receive work; an Admin can have completed actions. Optional Administrator-only `accountCounts:{active,inactive}` may be added after its query/test is documented.

Ticket summaries contain `{ticketNumber,summary,currentStatus,itPriority,ticketOwner:{id,name}|null,updatedAt}`; action summaries also include `{id,status,description,assignee,performedBy,actionAt,completedAt,updatedAt,ticketNumber}`. Drill-down: unassigned → `/staff/tickets?ownerState=unassigned`; my owned → `/staff/tickets?ownerId=<authenticated numeric user ID>`; status/priority → existing `status=`/`itPriority=` filters; recent/high-priority and action rows → `/staff/tickets/:ticketNumber`. Staff Queue currently stores filters only in component state, so the Lab 4 client must initialize supported filters from these URL parameters. The `recentlyUpdated` and `myCompletedActions30d` aggregates link to Queue or their short action list without claiming an unsupported time/performer Queue filter.

## 5. Safe failure and regression

Foreign Requester Ticket/action reads return 404; Requester action writes return 403. Return 401 for missing session, 403 for wrong role or mandatory password change, 400 for field validation, 409 for stale/business conflicts, and safe 500 for unexpected errors. Keep form drafts after recoverable failures and do not retry a stale write automatically. Health endpoint still returns its Lab 3 success response. All previously approved Lab 2/3 API behavior must remain covered by regression tests.
