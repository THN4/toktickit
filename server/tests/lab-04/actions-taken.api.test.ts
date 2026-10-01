import 'dotenv/config';
import { randomBytes, randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const suffix = randomBytes(6).toString('hex');
const email = (role: string) => `lab4-${role}-${suffix}@example.test`;
const ticketNumber = `L4-ACTION-${suffix}`;
const foreignTicketNumber = `L4-FOREIGN-${suffix}`;
const now = () => new Date().toISOString();
const cookie = (session: string) => `toktickit_session=${session}`;
const sessions = Array.from({ length: 5 }, () => randomBytes(32).toString('base64url'));
let users: number[] = [];
let tickets: number[] = [];
let actionIds: number[] = [];
let createdPayload: { clientRequestId: string; actionAt: string; description: string; assigneeId: number; followUpRequired: boolean; followUpNote: string };

beforeAll(async () => {
  const categories = await prisma.category.findFirst({ select: { id: true } });
  const systems = await prisma.relatedSystem.findFirst({ select: { id: true } });
  if (!categories || !systems) throw new Error('Seed category and related system before API tests.');
  const roles = [
    { role: 'REQUESTER' as const, label: 'requester', active: true },
    { role: 'REQUESTER' as const, label: 'foreign', active: true },
    { role: 'IT_STAFF' as const, label: 'staff', active: true },
    { role: 'IT_STAFF' as const, label: 'inactive', active: false },
    { role: 'ADMINISTRATOR' as const, label: 'admin', active: true },
  ];
  const created = await Promise.all(roles.map((item) => prisma.user.create({ data: { name: item.label, email: email(item.label), role: item.role, isActive: item.active, mustChangePassword: false } })));
  users = created.map((user) => user.id);
  await prisma.session.createMany({ data: sessions.map((session, index) => ({ id: session, userId: users[index]!, expiresAt: new Date(Date.now() + 3_600_000) })) });
  const result = await prisma.ticket.createManyAndReturn({ data: [
    { ticketNumber, requesterId: users[0]!, ticketOwnerId: users[2]!, categoryId: categories.id, relatedSystemId: systems.id, summary: 'Action API test', description: 'Action lifecycle test', currentStatus: 'OPEN' },
    { ticketNumber: foreignTicketNumber, requesterId: users[1]!, categoryId: categories.id, relatedSystemId: systems.id, summary: 'Foreign action test', description: 'Ownership test', currentStatus: 'OPEN' },
  ] });
  tickets = result.map((ticket) => ticket.id);
});

afterAll(async () => {
  await prisma.actionTakenEvent.deleteMany({ where: { actionTakenId: { in: actionIds } } });
  await prisma.actionTaken.deleteMany({ where: { id: { in: actionIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
  await prisma.session.deleteMany({ where: { id: { in: sessions } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 4 Actions Taken API', () => {
  it('creates one action for an exact retry, then rejects reuse with different fields', async () => {
    const body = { clientRequestId: randomUUID(), actionAt: now(), description: 'Inspect the service', assigneeId: users[2], followUpRequired: true, followUpNote: 'Review tomorrow' };
    createdPayload = body as typeof createdPayload;
    const first = await request(app).post(`/api/staff/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[2]!)).send(body);
    expect(first.status).toBe(201);
    actionIds.push(first.body.data.id);
    expect(first.body.data).toMatchObject({ status: 'PLANNED', version: 1, assignee: { id: users[2] }, performedBy: null });
    const replay = await request(app).post(`/api/staff/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[2]!)).send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(first.body.data.id);
    const conflict = await request(app).post(`/api/staff/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[2]!)).send({ ...body, description: 'Different work' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(await prisma.actionTaken.count({ where: { id: first.body.data.id } })).toBe(1);
    expect(await prisma.actionTakenEvent.count({ where: { actionTakenId: first.body.data.id } })).toBe(1);
  });

  it('validates assignment, follow-up, and client-supplied identity', async () => {
    const body = { clientRequestId: randomUUID(), actionAt: now(), description: 'Check VPN' };
    const url = `/api/staff/tickets/${ticketNumber}/actions`;
    for (const invalid of [
      { assigneeId: users[0] }, { assigneeId: users[3] }, { assigneeId: users[4] },
      { followUpRequired: true }, { createdById: users[0] }, { actionAt: '2026-10-01' },
    ]) {
      const response = await request(app).post(url).set('Cookie', cookie(sessions[2]!)).send({ ...body, ...invalid });
      expect(response.status).toBe(400);
    }
    expect((await request(app).post(url).set('Cookie', cookie(sessions[0]!)).send(body)).status).toBe(403);
  });

  it('enforces ownership and staff/admin visibility', async () => {
    const owner = await request(app).get(`/api/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[0]!));
    expect(owner.status).toBe(200);
    expect(owner.body.data.items.length).toBeGreaterThan(0);
    expect((await request(app).get(`/api/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[1]!))).status).toBe(404);
    expect((await request(app).get(`/api/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[4]!))).status).toBe(200);
    expect((await request(app).get('/api/staff/action-assignees').set('Cookie', cookie(sessions[4]!))).body.data.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: users[2] })]));
    const queue = await request(app).get('/api/staff/tickets').set('Cookie', cookie(sessions[4]!));
    expect(queue.status).toBe(200);
    expect((await request(app).get(`/api/staff/tickets/${ticketNumber}`).set('Cookie', cookie(sessions[4]!))).status).toBe(200);
  });

  it('version checks edits and completion, preserves actor and append-only events', async () => {
    const id = actionIds[0]!;
    const edit = await request(app).patch(`/api/staff/actions/${id}`).set('Cookie', cookie(sessions[4]!)).send({ expectedVersion: 1, description: 'Inspect service logs' });
    expect(edit.status).toBe(200);
    expect(edit.body.data.version).toBe(2);
    expect((await request(app).patch(`/api/staff/actions/${id}`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 1, description: 'Stale edit' })).body.error.code).toBe('STALE_VERSION');
    expect((await request(app).patch(`/api/staff/actions/${id}/status`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 2, status: 'COMPLETED' })).status).toBe(400);
    const completed = await request(app).patch(`/api/staff/actions/${id}/status`).set('Cookie', cookie(sessions[4]!)).send({ expectedVersion: 2, status: 'COMPLETED', result: 'Service restored' });
    expect(completed.status).toBe(200);
    expect(completed.body.data).toMatchObject({ status: 'COMPLETED', version: 3, performedBy: { id: users[4] } });
    expect(completed.body.data.completedAt).toBeTruthy();
    expect((await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber } })).ticketOwnerId).toBe(users[2]);
    expect((await request(app).patch(`/api/staff/actions/${id}/status`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 3, status: 'CANCELLED' })).body.error.code).toBe('INVALID_ACTION_TRANSITION');
    expect((await request(app).patch(`/api/staff/actions/${id}`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 3, assigneeId: null })).status).toBe(400);
    const replay = await request(app).post(`/api/staff/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[2]!)).send(createdPayload);
    expect(replay.status).toBe(200);
    expect(replay.body.data).toMatchObject({ id, status: 'COMPLETED', version: 3 });
    const events = await prisma.actionTakenEvent.findMany({ where: { actionTakenId: id }, orderBy: { id: 'asc' } });
    expect(events.map((event) => event.eventType)).toEqual(['CREATED', 'UPDATED', 'STATUS_CHANGED']);
    expect(events[1]!.actorId).toBe(users[4]);
  });

  it('cancels without deletion and keeps actions ordered by actionAt then ID', async () => {
    const body = { clientRequestId: randomUUID(), actionAt: '2026-09-01T10:00:00+07:00', description: 'Superseded diagnostic' };
    const created = await request(app).post(`/api/staff/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[4]!)).send(body);
    expect(created.status).toBe(201);
    actionIds.push(created.body.data.id);
    const cancelled = await request(app).patch(`/api/staff/actions/${created.body.data.id}/status`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 1, status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');
    expect((await request(app).patch(`/api/staff/actions/${created.body.data.id}`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 2, description: 'Changed' })).body.error.code).toBe('INVALID_ACTION_TRANSITION');
    const listed = await request(app).get(`/api/tickets/${ticketNumber}/actions`).set('Cookie', cookie(sessions[0]!));
    expect(listed.body.data.items.map((item: { id: number }) => item.id)).toEqual([created.body.data.id, actionIds[0]]);
    expect(await prisma.actionTakenEvent.count({ where: { actionTakenId: created.body.data.id } })).toBe(2);
  });

  it('handles concurrent duplicate creates and the IN_PROGRESS to CANCELLED edge', async () => {
    const body = { clientRequestId: randomUUID(), actionAt: '2026-09-02T10:00:00+07:00', description: 'Check spare network adapter' };
    const url = `/api/staff/tickets/${ticketNumber}/actions`;
    const [a, b] = await Promise.all([
      request(app).post(url).set('Cookie', cookie(sessions[2]!)).send(body),
      request(app).post(url).set('Cookie', cookie(sessions[2]!)).send(body),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.id).toBe(b.body.data.id);
    actionIds.push(a.body.data.id);
    const started = await request(app).patch(`/api/staff/actions/${a.body.data.id}/status`).set('Cookie', cookie(sessions[2]!)).send({ expectedVersion: 1, status: 'IN_PROGRESS' });
    expect(started.status).toBe(200);
    const cancelled = await request(app).patch(`/api/staff/actions/${a.body.data.id}/status`).set('Cookie', cookie(sessions[4]!)).send({ expectedVersion: 2, status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.version).toBe(3);
    expect(await prisma.actionTakenEvent.count({ where: { actionTakenId: a.body.data.id } })).toBe(3);
  });
});
