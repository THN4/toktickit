const BASE_URL = "http://localhost:3000";

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;

  constructor(message: string, status: number, code?: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new ApiError(
      json.error?.message || "Authentication request failed.",
      res.status,
      json.error?.code,
    );
  }
  return json.data as T;
}

export function login(email: string, password: string): Promise<{ user: AuthUser }> {
  return authRequest("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return authRequest("/logout", { method: "POST" });
}

export function fetchCurrentUser(): Promise<{ user: AuthUser }> {
  return authRequest("/me", { method: "GET" });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ user: AuthUser }> {
  return authRequest("/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface CreateTicketInput {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  description: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
  summary: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  requesterResolvedAt?: string | null;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
}

export interface Attachment {
  id: number;
  ticketId: number;
  uploaderId: number;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  removedAt: string | null;
  removedByRequesterId: number | null;
  removalReason: string | null;
  createdAt: string;
  uploader?: { id: number; name: string };
  removedBy?: { id: number; name: string };
}

export interface TicketDetail extends Ticket {
  requester?: { id: number; name: string; email: string };
  ticketOwner?: { id: number; name: string; email: string } | null;
  attachments: Attachment[];
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type FormalStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";

export interface RequesterDashboardTicket {
  ticketNumber: string;
  summary: string;
  currentStatus: FormalStatus;
  itPriority: TicketPriority;
  updatedAt: string;
  resolvedAt: string | null;
  requesterResolvedAt: string | null;
}

export interface RequesterDashboardData {
  metrics: { openTickets: number; waitingForRequester: number; recentlyUpdated: number; recentlyResolved: number };
  attentionTickets: RequesterDashboardTicket[];
  recentTickets: RequesterDashboardTicket[];
  recentlyResolvedTickets: RequesterDashboardTicket[];
}

export interface StaffDashboardTicket {
  ticketNumber: string;
  summary: string;
  currentStatus: FormalStatus;
  itPriority: TicketPriority;
  ticketOwner: { id: number; name: string } | null;
  updatedAt: string;
}

export interface StaffDashboardAction {
  id: number;
  ticketNumber: string;
  status: ActionStatus;
  description: string;
  assignee: { id: number; name: string } | null;
  performedBy: { id: number; name: string } | null;
  actionAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface StaffDashboardData {
  metrics: {
    unassignedTickets: number;
    myOwnedTickets: number;
    byStatus: Record<FormalStatus, number>;
    byItPriority: Record<TicketPriority, number>;
    recentlyUpdated: number;
    myAssignedActions: number;
    myCompletedActions30d: number;
  };
  recentTickets: StaffDashboardTicket[];
  highPriorityTickets: StaffDashboardTicket[];
  myAssignedActionItems: StaffDashboardAction[];
  recentMyCompletedActions: StaffDashboardAction[];
}

export interface TicketAuthor {
  id: number;
  name: string;
  role: UserRole;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: TicketAuthor;
}

export interface StaffOwner {
  id: number;
  name: string;
  email: string;
}

export interface StaffTicketDetail extends TicketDetail {
  version: number;
  resolvedAt: string | null;
  requester: StaffOwner;
  ticketOwner: StaffOwner | null;
  publicComments: TicketComment[];
  internalNotes: TicketComment[];
}

export type ActionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface ActionTaken {
  id: number;
  ticketNumber: string;
  actionAt: string;
  description: string;
  result: string | null;
  status: ActionStatus;
  assignee: { id: number; name: string } | null;
  createdBy: { id: number; name: string };
  performedBy: { id: number; name: string } | null;
  completedAt: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionDraftInput {
  actionAt: string;
  description: string;
  result: string | null;
  assigneeId: number | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface GetTicketsResponse {
  tickets: Ticket[];
  pagination: Pagination;
}

export interface StaffQueueItem extends Ticket {
  requester: { id: number; name: string; email: string };
  ticketOwner: { id: number; name: string; email: string } | null;
}

export interface StaffQueueParams {
  search?: string; status?: string; requestedPriority?: string; itPriority?: string;
  ownerState?: 'assigned' | 'unassigned'; ownerId?: number; sort?: string; order?: 'asc' | 'desc'; page?: number; pageSize?: number;
}

export interface GetTicketsParams {
  search?: string;
  category?: string;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface AdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  initialPassword: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────
// 1. ดึง Categories สำหรับใส่ใน Dropdown
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/api/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  const json = await res.json();
  return json.data as Category[];
}

// 2. ดึง Related Systems สำหรับใส่ใน Dropdown
export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${BASE_URL}/api/related-systems`);
  if (!res.ok) throw new Error("Failed to fetch related systems");
  const json = await res.json();
  return json.data as RelatedSystem[];
}

// 3. ส่งข้อมูลสร้าง Ticket ใหม่
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await fetch(`${BASE_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error?.message || "Failed to create ticket";
    throw new Error(errorMsg);
  }
  return json.data as Ticket;
}

// 4. ดึงรายการตั๋ว My Tickets (พร้อม Search, Filter, Sort, Pagination)
export async function fetchTickets(params: GetTicketsParams): Promise<GetTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search && params.search.trim() !== "") {
    query.append("search", params.search.trim());
  }
  if (params.category && params.category !== "") {
    query.append("category", params.category);
  }
  if (params.requestedPriority && params.requestedPriority !== "") {
    query.append("requestedPriority", params.requestedPriority);
  }
  if (params.itPriority && params.itPriority !== "") {
    query.append("itPriority", params.itPriority);
  }
  if (params.status && params.status !== "") {
    query.append("status", params.status);
  }
  if (params.sort) {
    query.append("sort", params.sort);
  }
  if (params.order) {
    query.append("order", params.order);
  }
  if (params.page) {
    query.append("page", String(params.page));
  }
  if (params.pageSize) {
    query.append("pageSize", String(params.pageSize));
  }

  const res = await fetch(`${BASE_URL}/api/tickets?${query.toString()}`, { credentials: "include" });
  const json = await res.json();

  if (!res.ok) {
    const errorMsg = json.error?.message || "Failed to fetch tickets";
    throw new Error(errorMsg);
  }

  return json.data as GetTicketsResponse;
}

export async function fetchStaffQueue(params: StaffQueueParams): Promise<{ items: StaffQueueItem[]; pagination: Pagination }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
  const res = await fetch(`${BASE_URL}/api/staff/tickets?${query}`, { credentials: 'include' });
  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error?.message || 'Unable to fetch the IT Staff Queue.', res.status, json.error?.code);
  return json.data;
}

async function ticketApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error?.message || "Ticket request failed.", res.status, json.error?.code, json.error?.field);
  return json.data as T;
}

export function fetchRequesterDashboard(): Promise<RequesterDashboardData> {
  return ticketApiRequest('/requester/dashboard');
}

export function fetchStaffDashboard(): Promise<StaffDashboardData> {
  return ticketApiRequest('/staff/dashboard');
}

export function fetchStaffTicketDetail(ticketNumber: string): Promise<StaffTicketDetail> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}`);
}

export async function fetchActionsTaken(ticketNumber: string): Promise<ActionTaken[]> {
  const data = await ticketApiRequest<{ items: ActionTaken[] }>(`/tickets/${encodeURIComponent(ticketNumber)}/actions`);
  return data.items;
}

export async function fetchActionAssignees(): Promise<Array<{ id: number; name: string }>> {
  const data = await ticketApiRequest<{ items: Array<{ id: number; name: string }> }>("/staff/action-assignees");
  return data.items;
}

export function createActionTaken(ticketNumber: string, clientRequestId: string, input: ActionDraftInput): Promise<ActionTaken> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/actions`, { method: "POST", body: JSON.stringify({ clientRequestId, ...input }) });
}

export function updateActionTaken(id: number, expectedVersion: number, input: Partial<ActionDraftInput>): Promise<ActionTaken> {
  return ticketApiRequest(`/staff/actions/${id}`, { method: "PATCH", body: JSON.stringify({ expectedVersion, ...input }) });
}

export function updateActionStatus(id: number, expectedVersion: number, status: Exclude<ActionStatus, "PLANNED">, fields: { result?: string; actionAt?: string } = {}): Promise<ActionTaken> {
  return ticketApiRequest(`/staff/actions/${id}/status`, { method: "PATCH", body: JSON.stringify({ expectedVersion, status, ...fields }) });
}

export function fetchStaffOwners(): Promise<StaffOwner[]> {
  return ticketApiRequest("/staff/owners");
}

export function claimStaffTicket(ticketNumber: string, expectedVersion: number): Promise<StaffTicketDetail> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/claim`, { method: "POST", body: JSON.stringify({ expectedVersion }) });
}

export function updateTicketOwner(ticketNumber: string, ownerId: number | null, expectedVersion: number): Promise<StaffTicketDetail> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/owner`, { method: "PATCH", body: JSON.stringify({ ownerId, expectedVersion }) });
}

export function updateItPriority(ticketNumber: string, itPriority: TicketPriority, expectedVersion: number): Promise<StaffTicketDetail> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/it-priority`, { method: "PATCH", body: JSON.stringify({ itPriority, expectedVersion }) });
}

export function updateFormalStatus(ticketNumber: string, status: FormalStatus, expectedVersion: number, confirmed = false): Promise<StaffTicketDetail> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/status`, { method: "PATCH", body: JSON.stringify({ status, expectedVersion, confirmed }) });
}

export function recordRequesterResolution(ticketNumber: string): Promise<{ ticketNumber: string; currentStatus: FormalStatus; requesterResolvedAt: string }> {
  return ticketApiRequest(`/tickets/${encodeURIComponent(ticketNumber)}/requester-resolution`, { method: "POST" });
}

export function fetchPublicComments(ticketNumber: string): Promise<TicketComment[]> {
  return ticketApiRequest(`/tickets/${encodeURIComponent(ticketNumber)}/comments`);
}

export function createPublicComment(ticketNumber: string, content: string): Promise<TicketComment> {
  return ticketApiRequest(`/tickets/${encodeURIComponent(ticketNumber)}/comments`, { method: "POST", body: JSON.stringify({ content }) });
}

export function fetchInternalNotes(ticketNumber: string): Promise<TicketComment[]> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/notes`);
}

export function createInternalNote(ticketNumber: string, content: string): Promise<TicketComment> {
  return ticketApiRequest(`/staff/tickets/${encodeURIComponent(ticketNumber)}/notes`, { method: "POST", body: JSON.stringify({ content }) });
}

export function fetchAdminUsers(params: { search?: string; role?: UserRole | "" } = {}): Promise<{ users: AuthUser[] }> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.role) query.set("role", params.role);
  return ticketApiRequest(`/admin/users${query.toString() ? `?${query.toString()}` : ""}`);
}

export function createAdminUser(input: CreateAdminUserInput): Promise<{ user: AuthUser }> {
  return ticketApiRequest("/admin/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateAdminUser(id: number, input: AdminUserInput): Promise<{ user: AuthUser }> {
  return ticketApiRequest(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function resetAdminUserPassword(id: number, initialPassword: string): Promise<{ user: AuthUser }> {
  return ticketApiRequest(`/admin/users/${id}/initial-password`, { method: "POST", body: JSON.stringify({ initialPassword }) });
}

// 5. ดึงรายละเอียดตั๋วรายใบ (Ticket Detail)
export async function fetchTicketDetail(ticketNumber: string): Promise<TicketDetail> {
  const res = await fetch(`${BASE_URL}/api/tickets/${ticketNumber}`, { credentials: "include" });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error?.message || "Failed to fetch ticket detail";
    throw new Error(errorMsg);
  }
  return json.data as TicketDetail;
}

// 6. อัปโหลดไฟล์แนบ (Attachment Upload)
export async function uploadAttachment(ticketNumber: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/tickets/${ticketNumber}/attachments`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error?.message || "Failed to upload attachment";
    throw new Error(errorMsg);
  }
  return json.data as Attachment;
}

// 7. Soft-Remove ลบไฟล์แนบพร้อมระบุเหตุผล
export async function deleteAttachment(attachmentId: number, removalReason: string): Promise<Attachment> {
  const res = await fetch(`${BASE_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ removalReason }),
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) {
    const errorMsg = json.error?.message || "Failed to remove attachment";
    throw new Error(errorMsg);
  }
  return json.data as Attachment;
}

// 8. URL สำหรับดาวน์โหลดไฟล์
export function getAttachmentDownloadUrl(attachmentId: number): string {
  return `${BASE_URL}/api/attachments/${attachmentId}/download`;
}
