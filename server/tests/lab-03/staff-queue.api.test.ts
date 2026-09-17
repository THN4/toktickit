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
let staffSession = ''; let requesterSession = ''; let staffId = 0;
const ticketIds: number[] = [];
const fixture = randomBytes(8).toString('hex');
const staffEmail = `queue-staff-${fixture}@example.test`; const requesterEmail = `queue-requester-${fixture}@example.test`;
const cookie = (session: string) => `toktickit_session=${session}`;

beforeAll(async () => {
  const [staff, requester, category, relatedSystem] = await Promise.all([
    prisma.user.upsert({ where: { email: staffEmail }, update: { name: 'Queue Staff', role: 'IT_STAFF', isActive: true, mustChangePassword: false }, create: { name: 'Queue Staff', email: staffEmail, role: 'IT_STAFF', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: requesterEmail }, update: { name: 'Queue Requester', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Queue Requester', email: requesterEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.category.findFirst({ where: { isActive: true } }), prisma.relatedSystem.findFirst({ where: { isActive: true } }),
  ]);
  if (!category || !relatedSystem) throw new Error('Reference seed data is required.');
  staffId = staff.id;
  staffSession = randomBytes(32).toString('base64url'); requesterSession = randomBytes(32).toString('base64url');
  await prisma.session.createMany({ data: [{ id: staffSession, userId: staff.id, expiresAt: new Date(Date.now() + 3_600_000) }, { id: requesterSession, userId: requester.id, expiresAt: new Date(Date.now() + 3_600_000) }] });
  const firstTicket = await prisma.ticket.create({ data: { ticketNumber: `QUEUE-${fixture}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, ticketOwnerId: staff.id, summary: `Queue search regression ${fixture}`, description: 'A Queue Ticket used to verify IT Staff access and filters.', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW' } });
  await prisma.ticket.update({ where: { id: firstTicket.id }, data: { updatedAt: new Date('2020-01-01T00:00:00.000Z') } });
  const secondTicket = await prisma.ticket.create({ data: { ticketNumber: `QUEUE-SECOND-${fixture}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, ticketOwnerId: staff.id, summary: `Queue ordering regression ${fixture}`, description: 'A newer Queue Ticket used to verify the default order.', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW' } });
  ticketIds.push(firstTicket.id, secondTicket.id);
});
afterAll(async () => { await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }); await prisma.session.deleteMany({ where: { id: { in: [staffSession, requesterSession] } } }); await prisma.user.deleteMany({ where: { email: { in: [staffEmail, requesterEmail] } } }); await prisma.$disconnect(); await pool.end(); });

describe('Lab 3 IT Staff Queue API', () => {
  it('allows IT Staff to search, filter, sort the Queue and returns documented metadata', async () => {
    const query = new URLSearchParams({ search: fixture, status: 'NEW', requestedPriority: 'HIGH', itPriority: 'HIGH', ownerState: 'assigned', ownerId: String(staffId), sort: 'ticketNumber', order: 'asc', page: '1', pageSize: '10' });
    const response = await request(app).get(`/api/staff/tickets?${query}`).set('Cookie', cookie(staffSession));
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item: { id: number }) => item.id)).toEqual(ticketIds);
    expect(response.body.data.items[0]).toMatchObject({ requester: { email: requesterEmail }, ticketOwner: { id: staffId }, category: expect.any(Object), relatedSystem: expect.any(Object) });
    expect(response.body.data.pagination).toMatchObject({ page: 1, pageSize: 10, totalItems: 2, totalPages: 1 });
  });
  it('uses updatedAt descending as the default Queue order with ticket number as a tie-breaker', async () => {
    const response = await request(app).get(`/api/staff/tickets?search=${fixture}`).set('Cookie', cookie(staffSession));
    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item: { id: number }) => item.id)).toEqual([ticketIds[1], ticketIds[0]]);
  });
  it('rejects unauthenticated/non-staff and invalid Queue queries', async () => {
    expect((await request(app).get('/api/staff/tickets')).status).toBe(401);
    expect((await request(app).get('/api/staff/tickets').set('Cookie', cookie(requesterSession))).status).toBe(403);
    const invalid = await request(app).get('/api/staff/tickets?pageSize=99&sort=ownerId').set('Cookie', cookie(staffSession));
    expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});
