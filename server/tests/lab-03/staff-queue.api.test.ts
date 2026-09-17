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
let staffSession = ''; let requesterSession = ''; let ticketId = 0;
const staffEmail = 'queue-staff@example.test'; const requesterEmail = 'queue-requester@example.test';
const cookie = (session: string) => `toktickit_session=${session}`;

beforeAll(async () => {
  const [staff, requester, category, relatedSystem] = await Promise.all([
    prisma.user.upsert({ where: { email: staffEmail }, update: { name: 'Queue Staff', role: 'IT_STAFF', isActive: true, mustChangePassword: false }, create: { name: 'Queue Staff', email: staffEmail, role: 'IT_STAFF', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: requesterEmail }, update: { name: 'Queue Requester', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Queue Requester', email: requesterEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.category.findFirst({ where: { isActive: true } }), prisma.relatedSystem.findFirst({ where: { isActive: true } }),
  ]);
  if (!category || !relatedSystem) throw new Error('Reference seed data is required.');
  staffSession = randomBytes(32).toString('base64url'); requesterSession = randomBytes(32).toString('base64url');
  await prisma.session.createMany({ data: [{ id: staffSession, userId: staff.id, expiresAt: new Date(Date.now() + 3_600_000) }, { id: requesterSession, userId: requester.id, expiresAt: new Date(Date.now() + 3_600_000) }] });
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `QUEUE-${Date.now()}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Queue search regression', description: 'A Queue Ticket used to verify IT Staff access and filters.', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW' } });
  ticketId = ticket.id;
});
afterAll(async () => { await prisma.ticket.deleteMany({ where: { id: ticketId } }); await prisma.session.deleteMany({ where: { id: { in: [staffSession, requesterSession] } } }); await prisma.user.deleteMany({ where: { email: { in: [staffEmail, requesterEmail] } } }); await prisma.$disconnect(); await pool.end(); });

describe('Lab 3 IT Staff Queue API', () => {
  it('allows IT Staff to search/filter the Queue and returns pagination metadata', async () => {
    const response = await request(app).get('/api/staff/tickets?search=queue%20search&requestedPriority=HIGH&page=1&pageSize=10').set('Cookie', cookie(staffSession));
    expect(response.status).toBe(200); expect(response.body.data.items.some((item: { id: number }) => item.id === ticketId)).toBe(true); expect(response.body.data.pagination).toMatchObject({ page: 1, pageSize: 10 });
  });
  it('rejects unauthenticated/non-staff and invalid Queue queries', async () => {
    expect((await request(app).get('/api/staff/tickets')).status).toBe(401);
    expect((await request(app).get('/api/staff/tickets').set('Cookie', cookie(requesterSession))).status).toBe(403);
    const invalid = await request(app).get('/api/staff/tickets?pageSize=99').set('Cookie', cookie(staffSession));
    expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});
