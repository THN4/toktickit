# Lab 3 UI Specification

> **Status:** Draft — Awaiting student review and approval before implementation begins.
> **Last Updated:** 2026-09-13
> **References:** `specification.md` Sections 5–6; `Lab_3_sheet.md` Sections 7–8

---

## 1. Design System: Zen Green Theme

Lab 3 extends, but does not replace, the Lab 2 visual system.

| Token | Value | Usage |
|-------|-------|-------|
| `green-primary` | `#006B3C` | Header, primary actions, strong emphasis |
| `green-secondary` | `#0B7A46` | Focus rings, active navigation, links, hover |
| `green-pale` | `#EAF6EF` | Selected rows and success emphasis |
| `page-bg` | `#F5F7F6` | Application background |
| `surface` | `#FFFFFF` | Cards, panels, dialogs |
| `text-primary` | `#1A2E22` | Primary text |
| `text-muted` | `#4A6355` | Supporting text |
| `border-default` | `#D1E0D8` | Inputs and card borders |
| `readonly-bg` | `#F0F4F1` | System/read-only fields |
| `error-text` | `#B91C1C` | Validation text |
| `error-border` | `#DC2626` | Invalid field border |
| `warning-bg` | `#FFFBEB` | Warning callout |
| `success-bg` | `#ECFDF5` | Success feedback |

- Use the Lab 2 typography, 4px spacing scale, 6px input/button radius, 8px
  card radius, and restrained shadows.
- Labels are above controls; required labels include a red `*`.
- Validation appears immediately below its field.
- Editable fields use white; read-only fields use `readonly-bg`.
- All badges include text and do not depend on color alone.

---

## 2. Application Shell and Route Guards

### 2.1 Authenticated Shell

```text
TokTickIT | My Tickets | Create Ticket | My Queue | Users | [Name] [Role] ▾
```

- Header: green-primary, white brand, 56px desktop / 48px mobile.
- Display the authenticated User's name and role; remove the Development
  Requester selector and Change Requester action.
- Profile menu exposes Logout and Change Password where applicable.
- Render links only for the current role:
  - Requester: My Tickets, Create Ticket.
  - IT Staff: My Queue.
  - Administrator: Users.
- A direct URL to an unauthorized route displays a Forbidden state; the backend
  separately rejects its API calls.

### 2.2 Route States

| Visitor state | Allowed screen |
|---------------|----------------|
| Unauthenticated | Login only |
| Must change initial password | Change Password and Logout only |
| Authenticated Requester | Requester screens only |
| Authenticated IT Staff | Ticket Queue and Ticket Detail workflow |
| Authenticated Administrator | User Management; read-only comment/note visibility where permitted |

---

## 3. Login and Mandatory Password Change

### 3.1 Login

```text
                 TokTickIT
             Sign in to your account

 Email *      [____________________________]
 Password *   [____________________________] [show/hide]

 [ Sign in ]
```

| State | Behavior |
|-------|----------|
| Initial | Email/password inputs, visible labels, show/hide password control |
| Validation | Email format and required-password errors appear below fields |
| Submitting | Button displays `Signing in…`; fields/button disabled |
| Invalid/inactive | Safe generic banner; never reveal account existence/status |
| Failure | Safe retryable API error; entered email is preserved |
| Success | Navigate to permitted home route or Change Password when required |

### 3.2 Change Password

Fields are Current Password, New Password, and Confirm New Password. New and
confirmation passwords must be masked by default and have show/hide controls.

- Until success, show a persistent explanation that access is limited.
- Validation covers required values, password policy, confirmation match, and
  current-password failure without leaking server details.
- While saving, disable all controls and show `Saving…`.
- Success clears the password fields and sends the User to their permitted home.

---

## 4. Requester Screens

Lab 2 Create Ticket, My Tickets, Ticket Detail, and Attachment behavior remain
visually and functionally continuous. The Requester system field now displays
the authenticated User, and no requester ID/selector is rendered or sent.

### 4.1 Requester Ticket Detail Addition

- Public Comments appear below the Ticket content and are visible to the
  Requester.
- The Comment composer has a textarea, character count, inline validation, and
  disabled/busy Submit state.
- `Problem appears resolved` is a separate secondary action with confirmation.
  It records the indication; it must not display an editable formal Status
  control or a Resolve/Close action.
- Internal Notes are not rendered for Requesters.

---

## 5. IT Staff Ticket Queue

### 5.1 Desktop Layout (≥ 992px)

```text
My Queue                                             [Filters]
[ Search ticket, requester, owner…                  ]
Status [All]  Requested Priority [All]  IT Priority [All]
Owner [All / Unassigned / Assigned]                 [Clear filters]

No. | Updated | Summary | Requester | Owner | Req. Priority | IT Priority | Status | Open
...
Showing 1 to 10 of 42                               [Prev] [1] [2] [Next]
```

| Element | Requirement |
|---------|-------------|
| Search | Debounce user input; searches documented Queue fields |
| Filters | One selection each for status, requested priority, IT priority, owner state, and owner |
| Sort | Clearly marked sortable headings; default Updated DESC, Ticket Number DESC |
| Badges | Requested Priority, IT Priority, status, and assigned/unassigned owner use text-labelled badges |
| Open action | Opens IT Staff Ticket Detail |
| Pagination | 10/25/50 page-size options, page controls, and `Showing X to Y of Z` |

### 5.2 Queue States

| State | Behavior |
|-------|----------|
| Loading | Table/card skeleton; controls are stable |
| Empty | `No Tickets are currently in the queue.` |
| No results | `No Tickets match the current search or filters.` with Clear Filters |
| Failure | Safe error banner and Retry |
| Forbidden | Do not render Queue navigation; direct route shows Forbidden |

### 5.3 Responsive

- Tablet may retain a constrained scrolling table or switch to cards.
- Mobile (<768px) uses cards with Ticket Number, Summary, Requester, Owner,
  priority badges, status, Updated time, and Open action.
- Filters collapse behind a `Filters` button; no horizontal page overflow.

---

## 6. IT Staff Ticket Detail

### 6.1 Layout

```text
← Back to My Queue
Ticket TKT-YYYY-XXXXXX       [Status badge]
Requester / Category / Related System / Created fields (read-only)
Requested Priority [badge]   IT Priority [select]
Ticket Owner [Unassigned / Staff select] [Claim]
Formal Status [select] [Update status]

Summary / Description / Attachments

Public Comments                         Internal Notes (IT Staff only)
[comment composer]                     [note composer]
comment timeline                        private-note timeline
```

### 6.2 Editable and Read-only Rules

| Area | Presentation |
|------|--------------|
| Requester-reported content, Ticket Number, dates, Requested Priority, Category, system, summary, description, attachments | Read-only gray-green fields or display rows |
| Ticket Owner | IT Staff-selectable control; Claim appears only for unassigned Ticket |
| IT Priority | Editable select for IT Staff only |
| Formal Status | Editable only through permitted transition options |
| Requester resolution indication | Read-only timestamp/banner for Staff |

### 6.3 Operational States

- Claim, assign/reassign, IT Priority, and status updates show separate busy
  feedback so unrelated controls remain understandable.
- Resolving, closing, cancelling, or changing owner opens a confirmation dialog
  that identifies the Ticket and action.
- Invalid status transition, inactive owner, empty Comment/Note, and safe API
  failures render inline or banner feedback without losing valid draft text.
- Internal Notes are visibly marked `Internal — visible to IT Staff and
  Administrators only`; their text never appears in Requester markup or API
  response.

### 6.4 Comment/Note Timeline

- Display author name, role label, timestamp, and escaped plain-text content.
- Newest entry appears at the bottom; no Edit/Delete controls.
- Composer content limit is 2,000 characters and whitespace-only content is
  blocked before submission and at the backend.

---

## 7. Administrator User Management

### 7.1 List Layout

```text
Users                                           [ + Create User ]
[ Search name or email… ]  Role [All roles ▾]

Name | Email | Role | Status | Edit
...
```

- Route and all API operations are Administrator-only.
- Status is a text-labelled Active/Inactive badge.
- User list uses Name/Email search and one optional role filter; pagination,
  bulk operations, and multi-column sorting are not required.
- Loading, empty, no-results, forbidden, success, validation, and safe failure
  states follow the shared feedback rules.

### 7.2 Create/Edit User Form

| Field | Mode / validation |
|-------|-------------------|
| Name | Required text input |
| Email | Required email; normalized; duplicate error below field |
| Role | Required single select: Requester, IT Staff, Administrator |
| Status | Active/Inactive control; safety validation on deactivation |
| Initial Password | Create/reset only; masked; clear local-lab helper text |
| Password-change notice | Explains that the next login requires a new password |

- Create and Edit are separate page/drawer/dialog modes with explicit title.
- Edit must show clear success/failure feedback and preserve non-sensitive form
  values on safe failure.
- Deactivate has a confirmation dialog. Self-deactivation and last-active-admin
  violations show a non-destructive inline explanation.
- No Delete action is rendered.

---

## 8. Shared Components and Accessibility

- Use reusable `Button`, `Input`, `Select`, `Badge`, `Alert`, `EmptyState`,
  `LoadingState`, `ConfirmationDialog`, and form-field components.
- Icon-only controls require an `aria-label` and tooltip.
- Use semantic `nav`, `main`, `form`, `button`, and associated labels.
- Errors use `aria-describedby` / live regions; dialogs trap focus and restore
  focus to their trigger.
- Keyboard access supports Tab, Shift+Tab, Enter, Space, and Escape for dialogs.
- Visible `:focus-visible` styling must not be removed.
- Mobile controls maintain at least 44px touch targets.

---

## 9. Responsive Rules

| Viewport | Rules |
|----------|-------|
| Desktop ≥ 992px | Centred max-width layout, Queue table, side-by-side relevant detail fields |
| Tablet 768–991px | Two-column layouts where useful; Queue may use constrained table or cards |
| Mobile < 768px | Stacked forms, card lists, condensed/hamburger navigation, filter drawer, full-width actions |
| All | No clipping, overlap, unreadable filenames, hidden feedback, or horizontal page overflow |

---

## 10. Visual Inspection Checklist

- [ ] All major Lab 3 screens use Zen Green tokens and Lab 2 component rules.
- [ ] Authenticated name/role replaces Development Requester selection.
- [ ] Role navigation contains no unauthorized destinations.
- [ ] Status, Requested Priority, IT Priority, role, and account-state badges
  include readable text.
- [ ] Editable and read-only states are visibly distinct.
- [ ] Loading, saving, success, validation, empty, no-results, forbidden, and
  safe-failure feedback is visible where applicable.
- [ ] Login, Change Password, Queue, Ticket Detail, and User Management work
  without clipping/overlap at desktop, tablet, and mobile.
- [ ] Keyboard focus and dialog behavior meet the accessibility rules.

---

## 11. Screenshot Paths

| Screen | Path |
|--------|------|
| Login / invalid / busy / error | `artifacts/lab-03/screenshots/authentication/` |
| Change Password | `artifacts/lab-03/screenshots/authentication/` |
| IT Staff Queue desktop/tablet/mobile/states | `artifacts/lab-03/screenshots/staff-queue/` |
| IT Staff Ticket Detail / comments / notes | `artifacts/lab-03/screenshots/staff-ticket-detail/` |
| User Management desktop/tablet/mobile/states | `artifacts/lab-03/screenshots/user-management/` |
