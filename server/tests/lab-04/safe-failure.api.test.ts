import 'dotenv/config';
import { randomBytes } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const suffix = randomBytes(6).toString('hex');
const requesterSession = randomBytes(32).toString('base64url');
const staffSession = randomBytes(32).toString('base64url');
let userIds: number[] = [];
const cookie = (session: string) => `toktickit_session=${session}`;

beforeAll(async () => {
  const [requester, staff] = await Promise.all([
    prisma.user.create({ data: { name: 'Safe Failure Requester', email: `safe-requester-${suffix}@example.test`, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.user.create({ data: { name: 'Safe Failure Staff', email: `safe-staff-${suffix}@example.test`, role: 'IT_STAFF', isActive: true, mustChangePassword: false } }),
  ]);
  userIds = [requester.id, staff.id];
  await prisma.session.createMany({ data: [
    { id: requesterSession, userId: requester.id, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: staffSession, userId: staff.id, expiresAt: new Date(Date.now() + 3_600_000) },
  ] });
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { id: { in: [requesterSession, staffSession] } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 4 safe API failures', () => {
  it('returns stable envelopes for health, unauthenticated, forbidden, validation and not-found paths', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ success: true, status: 'ok' });

    const unauthenticated = await request(app).get('/api/requester/dashboard');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });

    const forbidden = await request(app).get('/api/staff/action-assignees').set('Cookie', cookie(requesterSession));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.success).toBe(false);

    const invalid = await request(app).post('/api/staff/tickets/NO-SUCH-TICKET/actions').set('Cookie', cookie(staffSession)).send({});
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });

    const notFound = await request(app).get('/api/tickets/NO-SUCH-TICKET/actions').set('Cookie', cookie(requesterSession));
    expect(notFound.status).toBe(404);
    expect(notFound.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });

    for (const response of [unauthenticated, forbidden, invalid, notFound]) {
      expect(response.body.error).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toMatch(/PrismaClient|postgres| at .*\.ts:/i);
    }
  });
});
