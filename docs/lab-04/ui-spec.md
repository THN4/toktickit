# Lab 4 UI Specification

> **Status:** Draft for review. Extends Lab 3 Zen Green tokens/components and route authorization.

## 1. Shell and design

Add `Dashboard` navigation for all three roles. Administrator also gains the approved operational Queue/Ticket Detail links while retaining Users; Requester routes remain owned-only. Preserve active-page cues and direct-route forbidden behavior. Reuse the Lab 2/3 palette, typography, spacing, badges, buttons, forms, cards, tables, loading, empty and error components. Status/priority/privacy always have text labels and non-color cues.

## 2. Requester Dashboard

Show concise metric cards: Open Tickets, Waiting for You, Updated in 30 Days, Recently Resolved. Below, show Attention Needed, Recent Activity and Recently Resolved lists with ticket number, short summary, status badge, priority, relevant date and `View Ticket` action. Link cards to My Tickets and rows to owned Ticket Detail; initialize My Tickets status from supported dashboard URL parameters. Do not claim an aggregate card reproduces a filter that My Tickets lacks. Never render tickets outside session ownership. Zero cards display `0`; empty lists explain the next useful action and link to Create Ticket/My Tickets. The dashboard complements rather than duplicates My Tickets.

## 3. IT Staff and Administrator Dashboard

Show Unassigned, My Open Tickets, counts by all Ticket statuses, counts by IT Priority for non-terminal Tickets, Updated in 30 Days, My Assigned Actions, My Completed Actions in 30 Days, Recent Tickets and High Priority Tickets. Queue-compatible count cards link to filtered Queue; update Queue to initialize supported filters from URL parameters. Aggregate recent count links to Queue with a clear label, and action/Ticket rows open Ticket Detail. Show short lists of current user's non-terminal assigned actions and recently performed completed actions, each linking to its parent Ticket. Administrator reuses these operational views (its My Owned/My Assigned values are zero by rule) and may see compact account counts if implemented/tested. No dashboard list replaces Queue.

## 4. Actions Taken on Ticket Detail

### Read/list

Requester sees **all** actions on owned Tickets, including cancelled ones; IT Staff/Administrator see all actions on accessible Tickets. Stable rows/cards show action date/time, description, result or “Pending”, Action status, assignee or “Unassigned”, creator, performer or “Not yet performed”, follow-up indicator/note, attachment notes and audit date. Do not conflate actions with Public Comments or Internal Notes. Attachment notes are explanatory text only; actual files remain in the existing attachment section.

### Create/edit

IT Staff and Administrator get `Add Action Taken`, an inline form or accessible dialog, and View/Edit for each action. Fields: Action Date/Time (defaults to now, editable), Description, Result (required on completion), Assignee (active IT Staff or Unassigned), Follow-Up Required? toggle, conditional required Follow-up Note, optional Attachment Notes. Create starts `PLANNED`; controls expose only `Start`, `Complete`, or `Cancel` permitted by the action status matrix. Show confirmation for Complete/Cancel and never offer Delete. Creator, performer and audit times are read-only/auto; pending actions show no performer. Completed actions allow versioned content correction but lock assignee/status; cancelled actions are read-only.

Show field-level validation, including inactive-assignee rejection, missing Result on Complete, and conditional follow-up note. Preserve valid draft values after network failure. Generate one `clientRequestId` per create intent; disable duplicate submit and reuse the same ID only for an exact retry. On 409 stale version, explain that the record changed, offer reload, and do not silently resubmit/overwrite. Requester sees read-only records and no create/edit controls; server authorization still applies. Backend audit events remain append-only even when completed action text is corrected.

## 5. Ticket workflow

Only show Ticket transitions permitted from current status. Claim, owner, IT Priority and status controls send the Ticket's current version. Resolve/Close/Cancel use confirmation with Ticket number. Resolve guidance names every gate: one completed action with Result, no planned/in-progress action and no outstanding required follow-up on a non-cancelled action. Requester “problem appears resolved” remains separate, advisory, and never presented as formal status. After success refresh Ticket summary/status, resolved time and version. Conflict feedback asks staff to reload current Ticket before retrying; existing Public Comments and Internal Notes stay append-only.

## 6. Shared states and accessibility

- Loading skeleton or labelled progress; empty/no-results state; safe retryable API error; 401 login redirect; 403 Forbidden; 404 unavailable; 409 conflict with recovery action; success confirmation.
- Keep form drafts after recoverable failures; never show stack traces or raw database errors.
- Use semantic headings, labels, buttons, table/list semantics, `aria-describedby` for field errors, live regions for async feedback, and visible focus. Dialogs trap/restore focus and close by Escape where safe.
- All actions keyboard-operable; icon-only controls have accessible names; touch targets at least 44px. Do not use color alone for status, priority or follow-up.

## 7. Responsive and visual checks

| Viewport | Layout |
|---|---|
| Desktop ≥992px | Metric cards in a row/grid; staff recent lists beside each other where space allows; action table/list with aligned fields. |
| Tablet 768–991px | Two-column cards; action rows wrap to readable cards; controls remain visible. |
| Mobile <768px | One-column metric/list cards, stacked action form, full-width primary actions, collapsible navigation. |

All sizes: no page-level horizontal scroll, clipping, overlapping buttons, tiny timestamps or hidden validation. Capture staff dashboard, requester dashboard and action detail at desktop/tablet/mobile under `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`.

## 8. Final visual/accessibility checklist

- [ ] Zen Green colors/components match earlier labs; active nav and role destinations are clear.
- [ ] Dashboard names, counts, empty states and drill-down filters match API contract.
- [ ] Actions Taken clearly distinguish business date, audit date, creator, assignee, performer, action status, result, follow-up and attachment notes.
- [ ] Start/Complete/Cancel, inactive-assignee rejection, duplicate retry and append-only audit history are visible/testable.
- [ ] Editable vs read-only fields and Requester vs staff actions are evident.
- [ ] Validation appears beside its field; stale conflict preserves drafts and offers reload.
- [ ] Keyboard focus, semantic labels, contrast/non-color cues and dialog focus work.
- [ ] Desktop/tablet/mobile screenshots show no clipping, overlap or horizontal page overflow.
