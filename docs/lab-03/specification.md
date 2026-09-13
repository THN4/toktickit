# Lab 3 Sprint Engineering Specification

> **Status:** Draft — Awaiting student review and approval before implementation begins.
> **Last Updated:** 2026-09-13
> **Sprint:** Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Administrator User Management

---

## 1. Sprint Goal

Deliver a secure operational increment of TokTickIT. Real users authenticate with
an email address and password, complete a mandatory initial-password change, and
receive only the screens and operations allowed by their one assigned role.
Requesters retain the complete Lab 2 ticket experience using their authenticated
identity; IT Staff receive a searchable Ticket Queue and Ticket Detail workflow;
Administrators receive minimalist user management. Lab 2 data and the Zen Green
interface remain valid throughout the migration.

---

## 2. Stakeholder Request Interpretation

Replace the temporary Development Requester selector with secure authentication.
Enforce authorization at the backend, including Requester ownership, rather than
trusting client-provided identities or hidden buttons. IT Staff need workflow to
triage and progress Tickets, communicate publicly, and retain private notes.
Administrators manage accounts only; their responsibility remains separate from
normal IT Staff Ticket operations.

---

## 3. Scope

### Included

- Email/password login, logout, current-user retrieval, authenticated session,
  and mandatory initial-password change.
- One role per active User: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- Server-side role authorization and Requester ownership enforcement.
- Migration from `RequesterUser` / Development Requester selection to `User`
  without losing Tickets or Attachments.
- Full Lab 2 Requester Ticket and Attachment regression using authenticated
  identity.
- IT Staff Ticket Queue with search, filters, sorting, pagination, and
  assigned/unassigned ownership indicators.
- IT Staff Ticket Detail: claim, assign/reassign, IT Priority, permitted status
  transitions, Public Comments, and Internal Notes.
- Minimalist Administrator User Management: list, name/email search, optional
  role filter, create, edit, one role, activation/deactivation, and new initial
  password.
- PostgreSQL/Prisma migration, idempotent local-development seeds, automated
  tests, Zen Green UI, and responsive behavior.

### Excluded

- Email invitations, reset-email delivery, MFA, social login, and SSO.
- Self-registration or Requester-created accounts.
- Multiple roles, user deletion, bulk actions, import/export, role history,
  account history, account unlocking, or advanced recovery.
- Departments, organizations, tenant administration, profile photos, or extended
  user profiles.
- Actions Taken, SLA calculation, escalation, notifications, dashboards/KPIs,
  and production/cloud-infrastructure changes.
- Comment or Internal Note editing/deletion.
- Mandatory pagination, multi-column sorting, or multiple simultaneous filters
  for the Administrator user list.

---

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | The system shall authenticate only an active User with valid email and password credentials. |
| FR-02 | The system shall establish an authenticated session after login and provide the current User's safe identity, role, and password-change state. |
| FR-03 | The system shall require a User with an initial password to save a valid new password before allowing normal application routes or protected business APIs. |
| FR-04 | The system shall invalidate the authenticated session on logout and block protected access afterwards. |
| FR-05 | The application shell shall replace the Development Requester selector with the authenticated User's name, role, Logout action, and permitted navigation. |
| FR-06 | The backend shall enforce role authorization and Requester ownership for every protected operation. |
| FR-07 | An authenticated Requester shall create, list, view, and manage only their own Lab 2 Tickets and permitted Attachments. |
| FR-08 | An IT Staff User shall retrieve the Ticket Queue using documented search, filter, sort, and pagination queries. |
| FR-09 | An IT Staff User shall open Ticket Detail, claim or assign/reassign a Ticket owner, set IT Priority, and perform permitted status changes. |
| FR-10 | The system shall store and retrieve append-only Public Comments for Requesters, IT Staff, and Administrators. |
| FR-11 | The system shall store and retrieve append-only Internal Notes for IT Staff and Administrators only. |
| FR-12 | A Requester shall be able to indicate that the reported problem appears resolved without formally resolving or closing the Ticket. |
| FR-13 | An Administrator shall list Users, search by name/email, optionally filter by role, create a User, edit basic account information, assign exactly one role, activate/deactivate an account, and issue a new initial password. |
| FR-14 | The system shall preserve existing Categories, Related Systems, Tickets, Attachments, and their Requester ownership through the Lab 3 migration. |
| FR-15 | All Lab 3 screens shall reuse Zen Green tokens/components and provide meaningful loading, saving, success, validation, empty, no-results, forbidden, and safe-failure feedback where applicable. |

---

## 5. Business Rules

| ID | Business Rule |
|----|---------------|
| BR-01 | Only an active User with valid credentials may authenticate. Login failures use one safe generic message and do not reveal whether an email exists. |
| BR-02 | A User with `mustChangePassword = true` may use only logout, current-user, and password-change capabilities until a valid new password is saved. |
| BR-03 | Passwords are hashed with an adaptive one-way password-hashing algorithm. Plaintext passwords, hashes, sessions, and authentication secrets are never returned to the client or committed to source control. |
| BR-04 | Login validates an email after trimming and lowercasing it for lookup. Email uniqueness is case-insensitive. |
| BR-05 | Logout invalidates the current server-side session; a missing, expired, invalidated, or malformed session is unauthenticated. |
| BR-06 | One User has exactly one permitted role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. |
| BR-07 | The backend derives the Requester identity from the authenticated session. A client-supplied `requesterId`, user ID, or equivalent cannot select another Requester's data. |
| BR-08 | A Requester may read and manage only owned Tickets and Attachments, subject to the existing Lab 2 attachment rules. |
| BR-09 | A Ticket has one submitting Requester and zero or one primary Ticket Owner. An owner, when present, must be active and have an IT Staff or Administrator role. |
| BR-10 | Requested Priority is submitted by the Requester. IT Priority initially copies Requested Priority and may subsequently be changed only by IT Staff. |
| BR-11 | Required Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`. |
| BR-12 | The permitted status transition matrix is: `NEW → OPEN|CANCELLED`; `OPEN → IN_PROGRESS|WAITING_FOR_REQUESTER|CANCELLED`; `IN_PROGRESS → WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`; `WAITING_FOR_REQUESTER → IN_PROGRESS|CANCELLED`; `RESOLVED → CLOSED|REOPENED`; `CLOSED → REOPENED`; `REOPENED → OPEN|IN_PROGRESS|WAITING_FOR_REQUESTER|CANCELLED`; `CANCELLED → REOPENED`. |
| BR-13 | Only IT Staff may perform formal status transitions. Moving to `RESOLVED`, `CLOSED`, or `CANCELLED` requires an explicit UI confirmation. Lab 3 does not block resolution on Actions Taken because that feature is deferred. |
| BR-14 | A Requester may set only the non-formal `requesterResolvedAt` indication on their own Ticket; it neither changes formal status nor closes the Ticket. |
| BR-15 | Public Comments are visible to the Ticket Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator. |
| BR-16 | Comments and Notes are append-only. Their author and creation time are supplied by the backend; content is trimmed, must contain non-whitespace text, and is limited to 2,000 characters. |
| BR-17 | User-entered Comment and Note content is rendered as escaped plain text; HTML is neither stored as trusted markup nor rendered as HTML. |
| BR-18 | Administrator and IT Staff responsibilities remain separate. Administrators manage Users and may read Public Comments/Internal Notes as required by BR-15, but do not receive Ticket Queue, claim, assignment, IT Priority, or status-transition permissions in this sprint. |
| BR-19 | An Administrator may create a User with one valid role and a local-development initial password. The new or reset initial password always sets `mustChangePassword = true`. |
| BR-20 | An Administrator may update name, email, role, and activation state only. Duplicate emails and invalid role values are rejected. |
| BR-21 | An Administrator cannot deactivate their own account. The system also rejects removal/deactivation of the last active Administrator. Users are deactivated instead of deleted. |
| BR-22 | Queue search is case-insensitive over Ticket Number, Summary, Requester name/email, and current Ticket Owner name/email. Queue filters allow status, Requested Priority, IT Priority, owner state (assigned/unassigned), and owner ID; one value per filter is supported. |
| BR-23 | Queue sorting supports `updatedAt`, `createdAt`, `ticketNumber`, `currentStatus`, `requestedPriority`, and `itPriority`. Default ordering is `updatedAt DESC, ticketNumber DESC`; page numbers are 1-indexed and permitted page sizes are 10, 25, and 50 (default 10). |
| BR-24 | Invalid query parameters, invalid input, missing resources, conflicts, unauthenticated access, forbidden access, and unexpected errors are distinguished using safe documented API responses. Protected-resource errors must not disclose another User's Ticket, Attachment, or Internal Note existence. |
| BR-25 | Seed credentials are local-development-only, documented without real personal passwords or secrets, and the seed process is idempotent. |

### 5.1 Authorization Matrix

| Operation | Requester | IT Staff | Administrator |
|-----------|:---------:|:--------:|:-------------:|
| Login/logout/current user/change own required password | ✓ | ✓ | ✓ |
| Create/list/view own Tickets and permitted Attachments | ✓ | — | — |
| Indicate problem appears resolved on own Ticket | ✓ | — | — |
| Create/view Public Comments | Own Ticket | ✓ | Read only |
| Create/view Internal Notes | — | ✓ | Read only |
| IT Staff Queue, claim, assign/reassign, IT Priority, formal status change | — | ✓ | — |
| List/search/filter/create/edit/deactivate Users; set initial password | — | — | ✓ |

---

## 6. UI Specification Summary

> Full screen, component, state, accessibility, and responsive detail will be
> maintained in `docs/lab-03/ui-spec.md`.

- **Login / Change Password:** standalone unauthenticated views with field-level
  validation, busy state, safe error, and first-login route guard.
- **Application shell:** authenticated User name and role replace the Development
  Requester selector; role-specific links are rendered only for allowed
  destinations; Logout is always available.
- **Requester views:** preserve Lab 2 Create Ticket, My Tickets, Ticket Detail,
  and Attachments; identity and ownership now come from the session.
- **IT Staff Queue:** desktop table and responsive cards; query controls,
  Ticket/priority/owner badges, and clear loading/empty/no-results/failure
  states.
- **IT Staff Ticket Detail:** read-only reporter fields; visibly editable
  assignment, IT Priority, and permitted workflow controls; separate Public
  Comments and Internal Notes sections.
- **User Management:** Administrator-only list and create/edit form; Name,
  Email, Role, Status, Edit action, search, optional role filter, and
  account-safety feedback.
- **Visual rules:** use Lab 2 Zen Green tokens, consistent validation placement,
  accessible focus styles, text-labelled badges, and desktop/tablet/mobile
  layouts with no clipped/overlapping content or horizontal overflow.

---

## 7. Data Changes

### 7.1 Models and Relationships

| Model | Required Lab 3 change |
|-------|------------------------|
| `User` | Replaces `RequesterUser`; `id`, `name`, normalized unique `email`, `passwordHash`, `role`, `isActive`, `mustChangePassword`, `createdAt`, `updatedAt`; relations for submitted Tickets, owned Tickets, Attachments, Comments, and Notes. |
| `Ticket` | Migrate `requesterId` to `User.id`; migrate `ticketOwnerId` to nullable `User.id`; add statuses, `requesterResolvedAt`, and retain Requested/IT Priority, existing fields, timestamps, and Attachments. |
| `PublicComment` | `id`, `ticketId`, `authorId`, `content`, `createdAt`; many per Ticket and one author per record. |
| `InternalNote` | `id`, `ticketId`, `authorId`, `content`, `createdAt`; many per Ticket and one author per record. |
| `Attachment` | Retain Lab 2 behavior; migrate uploader/remover foreign keys from `RequesterUser` to `User` without discarding data. |
| `Category`, `RelatedSystem` | Retain existing records and relationships unchanged. |

### 7.2 Enums and Indexes

- `UserRole`: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- Extend `TicketStatus` to all values in BR-11.
- Retain `Priority`: `LOW`, `MEDIUM`, `HIGH`.
- Unique index on normalized User email; indexes on `User(role, isActive)`,
  `Ticket(requesterId)`, `Ticket(ticketOwnerId)`,
  `Ticket(currentStatus, updatedAt)`, and existing Ticket query columns.
- Index `PublicComment(ticketId, createdAt)` and
  `InternalNote(ticketId, createdAt)` for ordered detail retrieval.

### 7.3 Migration Strategy

1. Add User/role/session-supporting structures and non-destructive Ticket,
   Attachment, Comment, and Note fields.
2. Create one `REQUESTER` User for every existing `RequesterUser`, preserving
   stable IDs where the approved Prisma/PostgreSQL migration makes this safe, or
   use a documented ID mapping table/transaction otherwise.
3. Repoint Ticket requester, Ticket owner, Attachment uploader, and Attachment
   remover foreign keys; verify row counts and ownership before removing legacy
   references.
4. Assign a documented local initial password and `mustChangePassword = true`
   to migrated Requesters; never commit real credentials.
5. Remove the Development Requester selector, endpoint usage, and client-side
   requester context only after regression tests prove authenticated ownership.
6. Run migration against a copy of Lab 2 data and a fresh database; retain the
   migration and verification evidence.

### 7.4 Seed Data

The idempotent seed supplies at least four active Requesters and one inactive
Requester, three active IT Staff and one inactive IT Staff, and one active
Administrator. It also supplies realistic Tickets across Requesters, statuses,
priorities, and assigned/unassigned owners plus non-sensitive example Public
Comments and Internal Notes. Local-only sample credentials are documented in the
development setup but no real password is committed.

---

## 8. API Contract

> Full endpoint paths, payload shapes, validation, cookie/session behavior, and
> response examples will be maintained in `docs/lab-03/api-spec.md`.

| Capability | Required API behavior |
|------------|-----------------------|
| Authentication | Login, logout, current user, mandatory password change; use a secure `HttpOnly`, `Secure` in production, `SameSite=Lax` session cookie with server-side session storage and expiry. State-changing cookie-authenticated requests require same-origin/CSRF protection. |
| Requester continuity | Existing Lab 2 Ticket and Attachment APIs continue, but derive requester ownership from the session and no longer accept requester-selection identity. |
| Staff Queue/Detail | Retrieve queue; retrieve a Ticket for staff operations; claim/assign/reassign; update IT Priority and status; create/retrieve Public Comments and permitted Internal Notes. |
| Administration | Administrator-only list/search/filter Users; create; update name/email/role/activation; issue/reset a local initial password. |
| Safe errors | `401` unauthenticated, `403` forbidden, `400` invalid input, `404` missing permitted resource, `409` conflict, and `500` safe unexpected error. Retain applicable Lab 2 attachment status codes such as `413` and `415`. |

---

## 9. Acceptance Criteria

| ID | Given / When / Then |
|----|---------------------|
| AC-01 | Given an active User with valid credentials, when the User logs in, then authenticated access is established and safe current-user identity and role are returned. |
| AC-02 | Given invalid credentials or an inactive account, when login is attempted, then access is denied with a safe message and no session is established. |
| AC-03 | Given a User with an initial password, when login succeeds, then normal application routes and business APIs remain blocked until a valid replacement password is saved. |
| AC-04 | Given an authenticated User, when logout succeeds, then protected routes and APIs reject the former session. |
| AC-05 | Given a Requester who supplies another `requesterId`, when a Requester Ticket API is called, then the backend applies the session identity and exposes no other Requester's data. |
| AC-06 | Given an authenticated Requester, when Lab 2 Ticket and Attachment flows are used, then the owned data and permitted attachment behavior remain available without the selector. |
| AC-07 | Given an IT Staff User, when valid Queue search/filter/sort/page parameters are provided, then a paginated Queue with documented metadata and default ordering is returned. |
| AC-08 | Given invalid Queue query parameters, when the Queue API is requested, then a documented validation response is returned. |
| AC-09 | Given an IT Staff User and an unassigned Ticket, when Claim is confirmed, then that User becomes the Ticket Owner. |
| AC-10 | Given a permitted IT Staff status transition, when it is confirmed, then the new status is saved; an invalid transition is rejected. |
| AC-11 | Given a Requester, when they indicate the problem appears resolved, then the indication is saved but the formal status is not set to Resolved or Closed. |
| AC-12 | Given valid Public Comment text, when a permitted User posts it, then it is append-only and visible to the Requester, IT Staff, and Administrator. |
| AC-13 | Given a Requester, when an Internal Note endpoint is requested, then it is forbidden without exposing note content. |
| AC-14 | Given whitespace-only or over-limit Comment/Note text, when submitted, then validation rejects it and no entry is created. |
| AC-15 | Given an Administrator, when the User list is requested with name/email search or optional role filter, then matching Users are returned with safe account data. |
| AC-16 | Given a new User form with a duplicate email or invalid role, when submitted by an Administrator, then creation is rejected with field-level validation. |
| AC-17 | Given an Administrator sets a new initial password, when that User next logs in, then they must change it before accessing normal application functions. |
| AC-18 | Given an Administrator attempts self-deactivation or deactivation of the last active Administrator, when submitted, then the operation is rejected and active administration remains possible. |
| AC-19 | Given a non-Administrator, when an administration API or route is requested, then access is forbidden. |
| AC-20 | Given Lab 2 production-like data, when the Lab 3 migration runs, then Tickets, Attachments, and Requester ownership remain correct. |
| AC-21 | Given each major Lab 3 screen at desktop, tablet, and mobile viewport widths, when rendered, then Zen Green styling is consistent and there is no clipping, overlap, or horizontal overflow. |

---

## 10. Definition of Done

### 10.1 Product Completion

- [ ] FR-01 through FR-15 and BR-01 through BR-25 are implemented and verified.
- [ ] Every AC-01 through AC-21 maps to at least one planned and passing test.
- [ ] The approved authorization matrix is enforced by the backend, including
  ownership checks and safe protected-resource errors.
- [ ] Passwords are hashed; sessions, expiration, logout invalidation, and
  CSRF/same-origin protections match the API contract.
- [ ] The Lab 2 migration is non-destructive, verified with regression data,
  and seed data is idempotent and sufficient for all roles/workflows.
- [ ] Login, mandatory password change, Requester regression, Staff Queue/
  Detail, comments/notes, and Administrator User Management are complete.
- [ ] API, unit, UI, authorization, migration/regression, responsive, and E2E
  tests pass without skips or unrelated substitutes.
- [ ] Zen Green UI is consistent and usable on desktop, tablet, and mobile.
- [ ] Required docs, screenshots, evidence, and safe failure states are complete.

### 10.2 Course Delivery

- [ ] Each Issue is implemented on a feature branch and peer-reviewed before
  merge to `lab3-staging`.
- [ ] Integration testing succeeds on `lab3-staging`; one release PR merges it
  to `main`.
- [ ] No direct development occurs on `main` or `lab3-staging`.
- [ ] GitHub Issues/Kanban, reviewer record, AI-use record, test evidence, and
  the one-PDF submission satisfy the nine required answer parts.

---

## 11. Assumptions and Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Authentication uses a server-side session represented by an `HttpOnly` cookie, rather than browser-stored bearer tokens. | Limits client JavaScript access to credentials and makes logout invalidation explicit. |
| 2 | Email is normalized to lowercase after trimming for uniqueness and login lookup. | Avoids duplicate accounts differing only by email case. |
| 3 | A User's new or administrator-reset password always sets `mustChangePassword = true`; a User-chosen replacement clears it. | Makes initial-password behavior predictable and testable. |
| 4 | The Administrator role is limited to user administration; visibility rules for Public Comments/Internal Notes do not grant queue, assignment, priority, or workflow mutation permissions. | Preserves the handout's conceptual separation of Administrator and IT Staff responsibilities. |
| 5 | Queue pagination uses 10/25/50 items and stable secondary `ticketNumber DESC` sorting. | Keeps UI simple while preventing unstable page boundaries. |
| 6 | Comment and Note limits are 2,000 plain-text characters after trimming. | Supports meaningful support communication while bounding storage and rendering risk. |
| 7 | Status changes to Resolved, Closed, and Cancelled require a confirmation dialog, but require no Actions Taken validation. | The confirmation reduces accidental terminal workflow changes; Actions Taken are explicitly deferred to Lab 4. |
| 8 | Administrator user list search supports one optional role filter and no mandatory pagination. | Meets the minimalist Lab 3 scope without adding excluded advanced list behavior. |
