import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'crypto';
import request from 'supertest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const suffix = randomBytes(6).toString('hex');
const ownSession = randomBytes(32).toString('base64url');
const foreignSession = randomBytes(32).toString('base64url');
const emptySession = randomBytes(32).toString('base64url');
let ownerId = 0;
let foreignId = 0;
let emptyId = 0;
const ticketIds: number[] = [];
const auth = (session = ownSession) => request(app).get('/api/requester/dashboard').set('Cookie', `toktickit_session=${session}`);

beforeAll(async () => {
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  if (!category || !system) throw new Error('Reference seed required');
  const owner = await prisma.user.create({ data: { name: 'Dashboard Owner', email: `dash-owner-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
  const foreign = await prisma.user.create({ data: { name: 'Dashboard Foreign', email: `dash-foreign-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
  const emptyUser = await prisma.user.create({ data: { name: 'Dashboard Empty', email: `dash-empty-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
  ownerId = owner.id; foreignId = foreign.id; emptyId = emptyUser.id;
  await prisma.session.createMany({ data: [
    { id: ownSession, userId: ownerId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: foreignSession, userId: foreignId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: emptySession, userId: emptyId, expiresAt: new Date(Date.now() + 3_600_000) },
  ] });
  const now = Date.now();
  for (const [index, requesterId, status, resolvedAt, requesterResolvedAt, updatedAt] of [
    [1, ownerId, 'WAITING_FOR_REQUESTER', null, null, new Date(now - 60_000)],
    [2, ownerId, 'OPEN', null, new Date(now - 3_600_000), new Date(now - 120_000)],
    [3, ownerId, 'RESOLVED', new Date(now - 180_000), null, new Date(now - 180_000)],
    [4, ownerId, 'RESOLVED', null, null, new Date(now - 240_000)],
    [5, ownerId, 'CLOSED', new Date(now - 300_000), null, new Date(now - 300_000)],
    [6, foreignId, 'WAITING_FOR_REQUESTER', null, null, new Date(now - 30_000)],
    [7, ownerId, 'NEW', null, null, new Date(now - 31 * 24 * 60 * 60 * 1000)],
  ] as const) {
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `RD-${suffix}-${index}`, requesterId, categoryId: category.id, relatedSystemId: system.id, summary: `Dashboard ${index}`, description: 'Fixture', requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', currentStatus: status, resolvedAt, requesterResolvedAt, updatedAt } });
    ticketIds.push(ticket.id);
  }
});

afterAll(async () => {
  if (ticketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.session.deleteMany({ where: { id: { in: [ownSession, foreignSession, emptySession] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, foreignId, emptyId] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 4 Requester dashboard API', () => {
  it('calculates owned metrics, attention order and real resolved timestamps only', async () => {
    const response = await auth();
    expect(response.status).toBe(200);
    expect(response.body.data.metrics).toEqual({ openTickets: 3, waitingForRequester: 1, recentlyUpdated: 5, recentlyResolved: 1 });
    expect(response.body.data.attentionTickets.map((item: { ticketNumber: string }) => item.ticketNumber)).toEqual([`RD-${suffix}-1`, `RD-${suffix}-2`]);
    expect(response.body.data.recentlyResolvedTickets.map((item: { ticketNumber: string }) => item.ticketNumber)).toEqual([`RD-${suffix}-3`]);
    expect(response.body.data.recentTickets).toHaveLength(5);
    expect(JSON.stringify(response.body.data)).not.toContain(`RD-${suffix}-6`);
    expect(response.body.data.recentTickets[0]).not.toHaveProperty('description');
  });

  it('returns zeros and empty lists for another Requester, and enforces role and query restrictions', async () => {
    const noTickets = await auth(emptySession);
    expect(noTickets.body.data.metrics).toEqual({ openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 });
    expect(noTickets.body.data.attentionTickets).toEqual([]);
    expect(noTickets.body.data.recentTickets).toEqual([]);
    const foreign = await auth(foreignSession);
    expect(foreign.body.data.metrics.openTickets).toBe(1);
    expect(foreign.body.data.attentionTickets).toHaveLength(1);
    expect(JSON.stringify(foreign.body.data)).not.toContain(`RD-${suffix}-1`);
    expect((await request(app).get('/api/requester/dashboard')).status).toBe(401);
    expect((await auth().query({ requesterId: foreignId })).status).toBe(400);
  });
});
