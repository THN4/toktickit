import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'crypto';
import request from 'supertest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const suffix = randomBytes(6).toString('hex');
const ticketNumber = `WF-${suffix}`;
const sessionId = randomBytes(32).toString('base64url');
const adminSessionId = randomBytes(32).toString('base64url');
let ticketId = 0;
let staffId = 0;

const edges: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  CANCELLED: ['REOPENED'],
};
const statuses = Object.keys(edges);
const auth = () => request(app).patch(`/api/staff/tickets/${ticketNumber}/status`).set('Cookie', `toktickit_session=${sessionId}`);

beforeAll(async () => {
  const [category, system] = await Promise.all([
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.relatedSystem.findFirst({ where: { isActive: true } }),
  ]);
  if (!category || !system) throw new Error('Seed reference data required');
  const staff = await prisma.user.create({ data: { name: 'Workflow Staff', email: `wf-staff-${suffix}@example.test`, role: 'IT_STAFF', isActive: true, mustChangePassword: false } });
  const requester = await prisma.user.create({ data: { name: 'Workflow Requester', email: `wf-requester-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
  const admin = await prisma.user.create({ data: { name: 'Workflow Admin', email: `wf-admin-${suffix}@example.test`, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false } });
  staffId = staff.id;
  await prisma.session.create({ data: { id: sessionId, userId: staffId, expiresAt: new Date(Date.now() + 3_600_000) } });
  await prisma.session.create({ data: { id: adminSessionId, userId: admin.id, expiresAt: new Date(Date.now() + 3_600_000) } });
  const ticket = await prisma.ticket.create({ data: { ticketNumber, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: 'Workflow test', description: 'Every edge and gate', requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', currentStatus: 'NEW' } });
  ticketId = ticket.id;
});

afterAll(async () => {
  if (ticketId) {
    await prisma.actionTakenEvent.deleteMany({ where: { actionTaken: { ticketId } } });
    await prisma.actionTaken.deleteMany({ where: { ticketId } });
    await prisma.ticket.delete({ where: { id: ticketId } });
  }
  await prisma.session.deleteMany({ where: { id: { in: [sessionId, adminSessionId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [`wf-staff-${suffix}@example.test`, `wf-requester-${suffix}@example.test`, `wf-admin-${suffix}@example.test`] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 4 Ticket workflow API', () => {
  it('requires a version for all four workflow writes and rejects stale writes', async () => {
    const base = `/api/staff/tickets/${ticketNumber}`;
    const header = { Cookie: `toktickit_session=${sessionId}` };
    for (const [method, path, body] of [
      ['post', 'claim', {}], ['patch', 'owner', { ownerId: null }],
      ['patch', 'it-priority', { itPriority: 'HIGH' }], ['patch', 'status', { status: 'OPEN' }],
    ] as const) {
      const response = await request(app)[method](`${base}/${path}`).set(header).send(body);
      expect(response.status).toBe(400);
      expect(response.body.error.field).toBe('expectedVersion');
    }
    const claim = await request(app).post(`${base}/claim`).set(header).send({ expectedVersion: 1 });
    expect(claim.status).toBe(200);
    expect(claim.body.data.version).toBe(2);
    for (const [path, body] of [
      ['claim', { expectedVersion: 1 }], ['owner', { expectedVersion: 1, ownerId: null }],
      ['it-priority', { expectedVersion: 1, itPriority: 'HIGH' }], ['status', { expectedVersion: 1, status: 'OPEN' }],
    ] as const) {
      const response = path === 'claim' ? await request(app).post(`${base}/${path}`).set(header).send(body) : await request(app).patch(`${base}/${path}`).set(header).send(body);
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('STALE_VERSION');
    }
    const owner = await request(app).patch(`${base}/owner`).set(header).send({ expectedVersion: 2, ownerId: null });
    expect(owner.body.data.version).toBe(3);
    const priority = await request(app).patch(`${base}/it-priority`).set(header).send({ expectedVersion: 3, itPriority: 'HIGH' });
    expect(priority.body.data.version).toBe(4);
  });

  it('enforces every permitted and denied transition and resolution prerequisites', async () => {
    const completed = await prisma.actionTaken.create({ data: { ticketId, clientRequestId: randomUUID(), actionAt: new Date(), description: 'Fixed issue', result: 'Working', status: 'COMPLETED', createdById: staffId, performedById: staffId, completedAt: new Date() } });
    for (const from of statuses) {
      for (const to of statuses) {
        const current = await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: from as never, version: { increment: 1 } } });
        const response = await auth().send({ status: to, expectedVersion: current.version, confirmed: true });
        expect(response.status).toBe(edges[from]!.includes(to) ? 200 : 409);
        if (response.status === 200) expect(response.body.data.version).toBe(current.version + 1);
        else expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      }
    }
    const setInProgress = async () => prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'IN_PROGRESS', version: { increment: 1 } } });
    await prisma.actionTaken.delete({ where: { id: completed.id } });
    let current = await setInProgress();
    let response = await auth().send({ status: 'RESOLVED', expectedVersion: current.version, confirmed: true });
    expect(response.body.error.code).toBe('RESOLUTION_PREREQUISITE');
    const action = await prisma.actionTaken.create({ data: { ticketId, clientRequestId: randomUUID(), actionAt: new Date(), description: 'Fixed issue', result: 'Working', status: 'COMPLETED', createdById: staffId, performedById: staffId, completedAt: new Date() } });
    const pending = await prisma.actionTaken.create({ data: { ticketId, clientRequestId: randomUUID(), actionAt: new Date(), description: 'Pending', status: 'PLANNED', createdById: staffId } });
    current = await setInProgress();
    response = await auth().send({ status: 'RESOLVED', expectedVersion: current.version, confirmed: true });
    expect(response.body.error.code).toBe('RESOLUTION_PREREQUISITE');
    await prisma.actionTaken.update({ where: { id: pending.id }, data: { status: 'CANCELLED' } });
    await prisma.actionTaken.update({ where: { id: action.id }, data: { followUpRequired: true, followUpNote: 'Check later' } });
    current = await setInProgress();
    response = await auth().send({ status: 'RESOLVED', expectedVersion: current.version, confirmed: true });
    expect(response.body.error.code).toBe('RESOLUTION_PREREQUISITE');
    await prisma.actionTaken.update({ where: { id: action.id }, data: { followUpRequired: false } });
    current = await setInProgress();
    response = await auth().send({ status: 'RESOLVED', expectedVersion: current.version, confirmed: true });
    expect(response.status).toBe(200);
    expect(response.body.data.resolvedAt).toBeTruthy();
    const reopened = await auth().send({ status: 'REOPENED', expectedVersion: response.body.data.version });
    expect(reopened.body.data.resolvedAt).toBeNull();
  });

  it('requires terminal confirmation and permits Administrator operational status writes', async () => {
    const current = await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: 'OPEN', version: { increment: 1 } } });
    const missingConfirmation = await auth().send({ status: 'CANCELLED', expectedVersion: current.version });
    expect(missingConfirmation.status).toBe(400);
    expect(missingConfirmation.body.error.code).toBe('CONFIRMATION_REQUIRED');
    const adminChange = await request(app).patch(`/api/staff/tickets/${ticketNumber}/status`).set('Cookie', `toktickit_session=${adminSessionId}`).send({ status: 'WAITING_FOR_REQUESTER', expectedVersion: current.version });
    expect(adminChange.status).toBe(200);
    expect(adminChange.body.data.currentStatus).toBe('WAITING_FOR_REQUESTER');
  });
});
