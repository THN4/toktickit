# Lab 3 REST API Contract

> **Status:** Draft — awaiting approval before implementation.
> **Reference:** `specification.md` Sections 5 and 8.

## 1. Conventions

- Base path: `/api`; JSON requests/responses use UTF-8.
- Authentication uses a server-side session identified by an `HttpOnly` cookie
  (`Secure` in production, `SameSite=Lax`). State-changing cookie requests must
  pass same-origin/CSRF protection.
- The backend derives User and Requester identity from the session. Client
  requester/user IDs never establish ownership.
- Safe error envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Please correct the highlighted fields.", "details": [] } }
```

| Status | Meaning |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created |
| 400 | Invalid input/query |
| 401 | No valid authenticated session |
| 403 | Authenticated but forbidden; no protected content |
| 404 | Permitted resource not found |
| 409 | Conflict (duplicate email, invalid state, last admin) |
| 413 / 415 | Lab 2 attachment size/type failure |
| 500 | Safe unexpected failure |

## 2. Authentication

| Method | Path | Request | Success |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | 200; session cookie + safe User |
| POST | `/auth/logout` | none | 200; invalidate session |
| GET | `/auth/me` | session | 200; safe User/session state |
| POST | `/auth/change-password` | `{ currentPassword, newPassword, confirmPassword }` | 200; clears `mustChangePassword` |

Safe User shape: `{ id, name, email, role, isActive, mustChangePassword }`.
Login never returns a password/hash. Invalid credential and inactive-account
responses use the same safe message.

## 3. Requester Continuity

Existing Lab 2 Ticket/Attachment endpoints remain, but no longer accept
`requesterId` as identity. They require an authenticated Requester and enforce
ownership at the server:

| Method | Path | Description |
|---|---|---|
| POST | `/tickets` | Create owned Ticket |
| GET | `/tickets` | List owned Tickets |
| GET | `/tickets/:ticketNumber` | Read owned Ticket |
| POST | `/tickets/:ticketNumber/attachments` | Add permitted owned attachment |
| GET | `/tickets/:ticketNumber/attachments` | List permitted attachments |
| GET | `/attachments/:id/download` | Download active permitted attachment |
| DELETE | `/attachments/:id` | Soft-remove permitted attachment |
| POST | `/tickets/:ticketNumber/requester-resolution` | Record Requester resolution indication |

`POST /tickets/:ticketNumber/requester-resolution` has no client body and returns
the updated indication. It cannot change formal Ticket status.

## 4. IT Staff Queue and Ticket Operations

All operations in this section require `IT_STAFF`.

| Method | Path | Request / query | Result |
|---|---|---|---|
| GET | `/staff/tickets` | `search,status,requestedPriority,itPriority,ownerState,ownerId,sort,order,page,pageSize` | Queue page + metadata |
| GET | `/staff/tickets/:ticketNumber` | — | Ticket detail, comments, permitted notes |
| POST | `/staff/tickets/:ticketNumber/claim` | — | Set current User as owner |
| PATCH | `/staff/tickets/:ticketNumber/owner` | `{ ownerId }` | Assign/reassign active permitted owner |
| PATCH | `/staff/tickets/:ticketNumber/it-priority` | `{ itPriority }` | Update IT Priority |
| PATCH | `/staff/tickets/:ticketNumber/status` | `{ status, confirmed }` | Permitted formal transition |

Queue response:

```json
{ "items": [], "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 } }
```

Permitted `sort` values are `updatedAt`, `createdAt`, `ticketNumber`,
`currentStatus`, `requestedPriority`, and `itPriority`; permitted page sizes are
10, 25, 50. Invalid parameters return 400. Default order is `updatedAt DESC,
ticketNumber DESC`.

## 5. Comments and Notes

| Method | Path | Roles | Request |
|---|---|---|---|
| GET | `/tickets/:ticketNumber/comments` | Ticket Requester, IT Staff, Administrator | — |
| POST | `/tickets/:ticketNumber/comments` | Ticket Requester, IT Staff | `{ content }` |
| GET | `/staff/tickets/:ticketNumber/notes` | IT Staff, Administrator | — |
| POST | `/staff/tickets/:ticketNumber/notes` | IT Staff | `{ content }` |

`content` is trimmed plain text, required, and 1–2,000 characters. Responses
include backend-controlled `author` and `createdAt`. No edit/delete endpoint
exists. Requesters receive 403 for Notes without note content.

## 6. Administrator User Management

All endpoints require `ADMINISTRATOR`.

| Method | Path | Request / query | Result |
|---|---|---|---|
| GET | `/admin/users` | `search`, optional `role` | Safe User list |
| POST | `/admin/users` | `{ name, email, role, initialPassword }` | 201; User with password change required |
| PATCH | `/admin/users/:id` | `{ name, email, role, isActive }` | Updated safe User |
| POST | `/admin/users/:id/initial-password` | `{ initialPassword }` | Resets password; requires next-login change |

Create/update reject duplicate normalized email and invalid roles. Deactivation
rejects self-deactivation and removal of the last active Administrator. No
delete, bulk, import/export, history, or multi-role endpoint exists.

## 7. Authorization and Failure Rules

- 401 is returned before a valid session exists; 403 is returned for an
  authenticated role/ownership violation.
- For another User's Ticket, Attachment, or Note, the API returns a safe
  forbidden/not-found response without metadata or existence confirmation.
- Validation errors contain field identifiers only when that does not disclose
  protected data.
- Backend logs may hold diagnostic detail; client responses never contain stack
  traces, raw database errors, secrets, password hashes, or session values.
