import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const requesterEmail = 'authorization-requester@example.test';
const staffEmail = 'authorization-staff@example.test';
let requesterSessionId = '';
let staffSessionId = '';

beforeAll(async () => {
  const requester = await prisma.user.upsert({
    where: { email: requesterEmail },
    update: { name: 'Authorization Requester', role: 'REQUESTER', isActive: true, mustChangePassword: false },
    create: { name: 'Authorization Requester', email: requesterEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false },
  });
  const staff = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { name: 'Authorization Staff', role: 'IT_STAFF', isActive: true, mustChangePassword: false },
    create: { name: 'Authorization Staff', email: staffEmail, role: 'IT_STAFF', isActive: true, mustChangePassword: false },
  });

  requesterSessionId = randomBytes(32).toString('base64url');
  staffSessionId = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.session.createMany({
    data: [
      { id: requesterSessionId, userId: requester.id, expiresAt },
      { id: staffSessionId, userId: staff.id, expiresAt },
    ],
  });
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { id: { in: [requesterSessionId, staffSessionId] } } });
  await prisma.user.deleteMany({ where: { email: { in: [requesterEmail, staffEmail] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 3 Requester authorization', () => {
  it('requires an authenticated Requester session for My Tickets', async () => {
    const unauthenticated = await request(app).get('/api/tickets');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHENTICATED');

    const staff = await request(app)
      .get('/api/tickets')
      .set('Cookie', `toktickit_session=${staffSessionId}`);
    expect(staff.status).toBe(403);
    expect(staff.body.error.code).toBe('FORBIDDEN');
  });

  it('derives Requester identity from the session and rejects client-supplied requesterId', async () => {
    const spoofed = await request(app)
      .get('/api/tickets?requesterId=999999')
      .set('Cookie', `toktickit_session=${requesterSessionId}`);

    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('CLIENT_IDENTITY_NOT_ALLOWED');

    const ownTickets = await request(app)
      .get('/api/tickets')
      .set('Cookie', `toktickit_session=${requesterSessionId}`);
    expect(ownTickets.status).toBe(200);
    expect(ownTickets.body.data.tickets.every((ticket: { requesterId: number }) => ticket.requesterId !== 999999)).toBe(true);
  });
});
