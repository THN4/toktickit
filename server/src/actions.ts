import type { Express, Request, RequestHandler, Response } from 'express';
import type { PrismaClient } from '../generated/prisma/client.js';

type Actor = { id: number; role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'; mustChangePassword: boolean };
type AuthRequest = Request & { auth?: { user: Actor } };
type Fields = { actionAt: Date; description: string; result: string | null; assigneeId: number | null; followUpRequired: boolean; followUpNote: string | null; attachmentNotes: string | null };

class ActionError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly field?: string) { super(message); }
}

const actionInclude = {
  ticket: { select: { ticketNumber: true } },
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  performedBy: { select: { id: true, name: true } },
} as const;

function fail(res: Response, error: unknown) {
  if (error instanceof ActionError) return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) } });
  return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Unable to process the action.' } });
}

function bad(field: string, message: string): never { throw new ActionError(400, 'VALIDATION_ERROR', message, field); }
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function bodyFields(body: unknown, allowed: readonly string[]) {
  if (!isObject(body)) bad('body', 'A JSON object is required.');
  for (const key of Object.keys(body)) if (!allowed.includes(key)) bad(key, `${key} is not editable.`);
  return body;
}
function requiredVersion(value: unknown) { if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) bad('expectedVersion', 'A positive expectedVersion is required.'); return value; }
function parseActionAt(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) bad('actionAt', 'actionAt must be an ISO-8601 timestamp with an offset.');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) bad('actionAt', 'actionAt must be a valid timestamp.');
  return date;
}
function textField(value: unknown, field: string, max: number, nullable = false) {
  if (value === null && nullable) return null;
  if (typeof value !== 'string') bad(field, `${field} must be text${nullable ? ' or null' : ''}.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) bad(field, `${field} must contain 1–${max} characters.`);
  return trimmed;
}
function optionalText(value: unknown, field: string, max: number) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim().length > max) bad(field, `${field} must have at most ${max} characters or be null.`);
  return value.trim() || null;
}
function assigneeId(value: unknown) { if (value === null) return null; if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) bad('assigneeId', 'assigneeId must be an active IT Staff ID or null.'); return value; }
function validateFields(fields: Fields, status: string) {
  if (fields.followUpRequired && !fields.followUpNote) bad('followUpNote', 'followUpNote is required when followUpRequired is true.');
  if (status === 'COMPLETED') {
    if (!fields.result) bad('result', 'result is required for a completed action.');
    if (fields.actionAt.getTime() > Date.now() + 5 * 60_000) bad('actionAt', 'Completed actionAt cannot be more than five minutes in the future.');
  }
}
function createFields(body: Record<string, unknown>): Fields {
  const fields: Fields = {
    actionAt: parseActionAt(body.actionAt),
    description: textField(body.description, 'description', 2000)!,
    result: body.result === undefined ? null : textField(body.result, 'result', 2000, true),
    assigneeId: body.assigneeId === undefined ? null : assigneeId(body.assigneeId),
    followUpRequired: body.followUpRequired === undefined ? false : typeof body.followUpRequired === 'boolean' ? body.followUpRequired : bad('followUpRequired', 'followUpRequired must be boolean.'),
    followUpNote: body.followUpNote === undefined ? null : optionalText(body.followUpNote, 'followUpNote', 2000),
    attachmentNotes: body.attachmentNotes === undefined ? null : optionalText(body.attachmentNotes, 'attachmentNotes', 1000),
  };
  validateFields(fields, 'PLANNED');
  return fields;
}
function mergedFields(current: Fields, body: Record<string, unknown>): Fields {
  const fields: Fields = {
    actionAt: 'actionAt' in body ? parseActionAt(body.actionAt) : current.actionAt,
    description: 'description' in body ? textField(body.description, 'description', 2000)! : current.description,
    result: 'result' in body ? textField(body.result, 'result', 2000, true) : current.result,
    assigneeId: 'assigneeId' in body ? assigneeId(body.assigneeId) : current.assigneeId,
    followUpRequired: 'followUpRequired' in body ? typeof body.followUpRequired === 'boolean' ? body.followUpRequired : bad('followUpRequired', 'followUpRequired must be boolean.') : current.followUpRequired,
    followUpNote: 'followUpNote' in body ? optionalText(body.followUpNote, 'followUpNote', 2000) : current.followUpNote,
    attachmentNotes: 'attachmentNotes' in body ? optionalText(body.attachmentNotes, 'attachmentNotes', 1000) : current.attachmentNotes,
  };
  return fields;
}
function snapshot(action: { actionAt: Date; description: string; result: string | null; status: string; assigneeId: number | null; followUpRequired: boolean; followUpNote: string | null; attachmentNotes: string | null; performedById: number | null; completedAt: Date | null; version: number }) {
  return { actionAt: action.actionAt.toISOString(), description: action.description, result: action.result, status: action.status, assigneeId: action.assigneeId, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote, attachmentNotes: action.attachmentNotes, performedById: action.performedById, completedAt: action.completedAt?.toISOString() ?? null, version: action.version };
}
export function registerActionRoutes(app: Express, prisma: PrismaClient, guards: { authenticate: RequestHandler; staff: RequestHandler; trustedOrigin: RequestHandler }) {
  const { authenticate, staff, trustedOrigin } = guards;
  const loadAction = (id: number) => prisma.actionTaken.findUnique({ where: { id }, include: actionInclude });
  const asResponse = (action: NonNullable<Awaited<ReturnType<typeof loadAction>>>) => ({ id: action.id, ticketNumber: action.ticket.ticketNumber, actionAt: action.actionAt, description: action.description, result: action.result, status: action.status, assignee: action.assignee, createdBy: action.createdBy, performedBy: action.performedBy, completedAt: action.completedAt, followUpRequired: action.followUpRequired, followUpNote: action.followUpNote, attachmentNotes: action.attachmentNotes, version: action.version, createdAt: action.createdAt, updatedAt: action.updatedAt });
  const ticketOr404 = async (ticketNumber: string, actor: Actor) => {
    const ticket = await prisma.ticket.findFirst({ where: actor.role === 'REQUESTER' ? { ticketNumber, requesterId: actor.id } : { ticketNumber }, select: { id: true } });
    if (!ticket) throw new ActionError(404, 'NOT_FOUND', 'Ticket not found.');
    return ticket;
  };
  const activeAssignee = async (id: number | null) => {
    if (id === null) return;
    const user = await prisma.user.findFirst({ where: { id, role: 'IT_STAFF', isActive: true }, select: { id: true } });
    if (!user) bad('assigneeId', 'assigneeId must reference active IT Staff.');
  };

  app.get('/api/tickets/:ticketNumber/actions', authenticate, async (req: AuthRequest, res) => {
    try {
      const actor = req.auth!.user;
      if (actor.mustChangePassword) throw new ActionError(403, 'PASSWORD_CHANGE_REQUIRED', 'A password change is required.');
      const ticket = await ticketOr404(String(req.params.ticketNumber), actor);
      const actions = await prisma.actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: [{ actionAt: 'asc' }, { id: 'asc' }], include: actionInclude });
      return res.status(200).json({ success: true, data: { items: actions.map(asResponse) } });
    } catch (error) { return fail(res, error); }
  });

  app.get('/api/staff/action-assignees', authenticate, staff, async (_req, res) => {
    try {
      const users = await prisma.user.findMany({ where: { role: 'IT_STAFF', isActive: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: { id: true, name: true } });
      return res.status(200).json({ success: true, data: { items: users } });
    } catch (error) { return fail(res, error); }
  });

  app.post('/api/staff/tickets/:ticketNumber/actions', trustedOrigin, authenticate, staff, async (req: AuthRequest, res) => {
    try {
      const actor = req.auth!.user;
      const body = bodyFields(req.body, ['clientRequestId', 'actionAt', 'description', 'result', 'assigneeId', 'followUpRequired', 'followUpNote', 'attachmentNotes']);
      if (typeof body.clientRequestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.clientRequestId)) bad('clientRequestId', 'A UUID clientRequestId is required.');
      const requestId = body.clientRequestId.toLowerCase();
      const fields = createFields(body);
      const ticket = await ticketOr404(String(req.params.ticketNumber), actor);
      const key = { createdById_ticketId_clientRequestId: { createdById: actor.id, ticketId: ticket.id, clientRequestId: requestId } };
      const matches = (original: Record<string, unknown>) => original.actionAt === fields.actionAt.toISOString() && original.description === fields.description && original.result === fields.result && original.assigneeId === fields.assigneeId && original.followUpRequired === fields.followUpRequired && original.followUpNote === fields.followUpNote && original.attachmentNotes === fields.attachmentNotes;
      const replay = async () => {
        const existing = await prisma.actionTaken.findUnique({ where: key });
        if (!existing) return false;
        const created = await prisma.actionTakenEvent.findFirst({ where: { actionTakenId: existing.id, eventType: 'CREATED' }, orderBy: { id: 'asc' }, select: { next: true } });
        if (!created || !isObject(created.next) || !matches(created.next)) throw new ActionError(409, 'IDEMPOTENCY_CONFLICT', 'clientRequestId was used with different action fields.');
        const loaded = await loadAction(existing.id);
        return res.status(200).json({ success: true, data: asResponse(loaded!) });
      };
      const existingResponse = await replay();
      if (existingResponse) return existingResponse;
      await activeAssignee(fields.assigneeId);
      let id: number;
      try {
        id = await prisma.$transaction(async (tx) => {
          const action = await tx.actionTaken.create({ data: { ...fields, ticketId: ticket.id, clientRequestId: requestId, createdById: actor.id } });
          await tx.actionTakenEvent.create({ data: { actionTakenId: action.id, actorId: actor.id, eventType: 'CREATED', next: snapshot(action) } });
          await tx.ticket.update({ where: { id: ticket.id }, data: { version: { increment: 1 } } });
          return action.id;
        });
      } catch (error) {
        const concurrentResponse = await replay();
        if (concurrentResponse) return concurrentResponse;
        throw error;
      }
      return res.status(201).json({ success: true, data: asResponse((await loadAction(id))!) });
    } catch (error) { return fail(res, error); }
  });

  const updateAction = async (req: AuthRequest, res: Response, isStatus: boolean) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) throw new ActionError(404, 'NOT_FOUND', 'Action not found.');
      const body = bodyFields(req.body, isStatus ? ['status', 'expectedVersion', 'result', 'actionAt'] : ['expectedVersion', 'actionAt', 'description', 'result', 'assigneeId', 'followUpRequired', 'followUpNote', 'attachmentNotes']);
      const expectedVersion = requiredVersion(body.expectedVersion);
      const current = await prisma.actionTaken.findUnique({ where: { id } });
      if (!current) throw new ActionError(404, 'NOT_FOUND', 'Action not found.');
      if (current.version !== expectedVersion) throw new ActionError(409, 'STALE_VERSION', 'Action changed; reload before saving.');
      const fields = mergedFields(current, body);
      let nextStatus = current.status;
      let completedAt = current.completedAt;
      let performedById = current.performedById;
      if (isStatus) {
        const allowed = current.status === 'PLANNED' ? ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] : current.status === 'IN_PROGRESS' ? ['COMPLETED', 'CANCELLED'] : [];
        if (typeof body.status !== 'string' || !allowed.includes(body.status)) throw new ActionError(409, 'INVALID_ACTION_TRANSITION', 'Action status transition is not permitted.');
        nextStatus = body.status as typeof nextStatus;
        if (nextStatus !== 'COMPLETED' && ('result' in body || 'actionAt' in body)) bad('body', 'result and actionAt may be changed here only when completing an action.');
        if (nextStatus === 'COMPLETED') { performedById = req.auth!.user.id; completedAt = new Date(); }
      } else {
        if (current.status === 'CANCELLED') throw new ActionError(409, 'INVALID_ACTION_TRANSITION', 'Cancelled actions are read-only.');
        if (current.status === 'COMPLETED' && 'assigneeId' in body) bad('assigneeId', 'Completed action assignee cannot change.');
        if (Object.keys(body).length === 1) bad('body', 'At least one editable field is required.');
      }
      validateFields(fields, nextStatus);
      if (current.assigneeId !== fields.assigneeId) await activeAssignee(fields.assigneeId);
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.actionTaken.updateMany({ where: { id, version: expectedVersion }, data: { ...fields, status: nextStatus, performedById, completedAt, version: { increment: 1 } } });
        if (changed.count !== 1) throw new ActionError(409, 'STALE_VERSION', 'Action changed; reload before saving.');
        const next = await tx.actionTaken.findUniqueOrThrow({ where: { id } });
        await tx.actionTakenEvent.create({ data: { actionTakenId: id, actorId: req.auth!.user.id, eventType: isStatus ? 'STATUS_CHANGED' : 'UPDATED', prior: snapshot(current), next: snapshot(next) } });
        await tx.ticket.update({ where: { id: current.ticketId }, data: { version: { increment: 1 } } });
        return next;
      });
      return res.status(200).json({ success: true, data: asResponse((await loadAction(updated.id))!) });
    } catch (error) { return fail(res, error); }
  };
  app.patch('/api/staff/actions/:id', trustedOrigin, authenticate, staff, (req: AuthRequest, res) => updateAction(req, res, false));
  app.patch('/api/staff/actions/:id/status', trustedOrigin, authenticate, staff, (req: AuthRequest, res) => updateAction(req, res, true));
}
