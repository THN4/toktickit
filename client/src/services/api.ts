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

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
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
