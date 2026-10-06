import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'crypto';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const suffix = randomBytes(6).toString('hex');
const staffSession = randomBytes(32).toString('base64url');
const adminSession = randomBytes(32).toString('base64url');
const requesterSession = randomBytes(32).toString('base64url');
let staffId = 0;
let adminId = 0;
let requesterId = 0;
const ticketIds: number[] = [];
const ticketNo = `SD-${suffix}`;
const auth = (session: string) => request(app).get('/api/staff/dashboard').set('Cookie', `toktickit_session=${session}`);

beforeAll(async () => {
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  if (!category || !system) throw new Error('Reference seed required');
  const staff = await prisma.user.create({ data: { name: 'Dashboard Staff', email: `dash-staff-${suffix}@example.test`, role: 'IT_STAFF', isActive: true, mustChangePassword: false } });
  const admin = await prisma.user.create({ data: { name: 'Dashboard Admin', email: `dash-admin-${suffix}@example.test`, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false } });
  const requester = await prisma.user.create({ data: { name: 'Dashboard Requester', email: `dash-requester-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
  staffId = staff.id; adminId = admin.id; requesterId = requester.id;
  await prisma.session.createMany({ data: [
    { id: staffSession, userId: staffId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: adminSession, userId: adminId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: requesterSession, userId: requesterId, expiresAt: new Date(Date.now() + 3_600_000) },
  ] });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: ticketNo, requesterId, categoryId: category.id, relatedSystemId: system.id, summary: 'Urgent dashboard ticket', description: 'Fixture', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'OPEN', ticketOwnerId: staffId } });
  ticketIds.push(ticket.id);
  await prisma.actionTaken.create({ data: { ticketId: ticket.id, clientRequestId: randomUUID(), actionAt: new Date(), description: 'Current assignment', status: 'PLANNED', assigneeId: staffId, createdById: staffId } });
  await prisma.actionTaken.create({ data: { ticketId: ticket.id, clientRequestId: randomUUID(), actionAt: new Date(), description: 'Completed by admin', status: 'COMPLETED', result: 'Done', createdById: adminId, performedById: adminId, completedAt: new Date() } });
});

afterAll(async () => {
  if (ticketIds.length) {
    await prisma.actionTakenEvent.deleteMany({ where: { actionTaken: { ticketId: { in: ticketIds } } } });
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  }
  await prisma.session.deleteMany({ where: { id: { in: [staffSession, adminSession, requesterSession] } } });
  await prisma.user.deleteMany({ where: { id: { in: [staffId, adminId, requesterId] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 4 Staff dashboard API', () => {
  it('matches database predicates and returns bounded ticket/action summaries', async () => {
    const response = await auth(staffSession);
    expect(response.status).toBe(200);
    const { metrics } = response.body.data;
    const active = { currentStatus: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } } as const;
    expect(metrics.unassignedTickets).toBe(await prisma.ticket.count({ where: { currentStatus: { in: [...active.currentStatus.in] }, ticketOwnerId: null } }));
    expect(metrics.myOwnedTickets).toBe(await prisma.ticket.count({ where: { currentStatus: { in: [...active.currentStatus.in] }, ticketOwnerId: staffId } }));
    for (const status of ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'] as const) {
      expect(metrics.byStatus[status]).toBe(await prisma.ticket.count({ where: { currentStatus: status } }));
    }
    for (const priority of ['LOW', 'MEDIUM', 'HIGH'] as const) {
      expect(metrics.byItPriority[priority]).toBe(await prisma.ticket.count({ where: { currentStatus: { in: [...active.currentStatus.in] }, itPriority: priority } }));
    }
    expect(metrics.myAssignedActions).toBe(1);
    const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(metrics.recentlyUpdated).toBe(await prisma.ticket.count({ where: { updatedAt: { gte: windowStart } } }));
    expect(metrics.myCompletedActions30d).toBe(await prisma.actionTaken.count({ where: { performedById: staffId, status: 'COMPLETED', completedAt: { gte: windowStart } } }));
    expect(response.body.data.highPriorityTickets).toEqual(expect.arrayContaining([expect.objectContaining({ ticketNumber: ticketNo })]));
    expect(response.body.data.myAssignedActionItems).toEqual(expect.arrayContaining([expect.objectContaining({ ticketNumber: ticketNo, description: 'Current assignment' })]));
    for (const key of ['recentTickets', 'highPriorityTickets', 'myAssignedActionItems', 'recentMyCompletedActions']) expect(response.body.data[key].length).toBeLessThanOrEqual(5);
    expect(response.body.data.recentTickets[0]).not.toHaveProperty('description');
  });

  it('gives Administrator the operational view without owned/assigned work and rejects Requesters', async () => {
    const admin = await auth(adminSession);
    expect(admin.status).toBe(200);
    expect(admin.body.data.metrics.myOwnedTickets).toBe(0);
    expect(admin.body.data.metrics.myAssignedActions).toBe(0);
    expect(admin.body.data.metrics.myCompletedActions30d).toBe(1);
    expect(admin.body.data.recentMyCompletedActions).toEqual(expect.arrayContaining([expect.objectContaining({ ticketNumber: ticketNo })]));
    expect((await auth(requesterSession)).status).toBe(403);
    expect((await request(app).get('/api/staff/dashboard')).status).toBe(401);
    expect((await auth(staffSession).query({ ownerId: adminId })).status).toBe(400);
  });

  it('PERF-01: keeps the seeded Staff dashboard response below the local p95 target', async () => {
    const samples: number[] = [];
    for (let index = 0; index < 10; index += 1) {
      const start = performance.now();
      const response = await auth(staffSession);
      samples.push(performance.now() - start);
      expect(response.status).toBe(200);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
    console.info(`PERF-01 dashboard: 10 requests, p95=${p95.toFixed(1)}ms`);
    expect(p95).toBeLessThan(500);
  });
});
