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
const fixture = randomBytes(8).toString('hex');
const adminEmail = `admin-actor-${fixture}@example.test`;
const targetEmail = `admin-target-${fixture}@example.test`;
const requesterEmail = `admin-requester-${fixture}@example.test`;
const cookie = (session: string) => `toktickit_session=${session}`;
let adminId = 0;
let targetId = 0;
let requesterId = 0;
let adminSession = '';
let requesterSession = '';

beforeAll(async () => {
  const [admin, target, requester] = await Promise.all([
    prisma.user.upsert({ where: { email: adminEmail }, update: { name: 'Admin Actor', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false }, create: { name: 'Admin Actor', email: adminEmail, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: targetEmail }, update: { name: 'Admin Target', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Admin Target', email: targetEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: requesterEmail }, update: { name: 'Admin API Requester', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Admin API Requester', email: requesterEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
  ]);
  adminId = admin.id; targetId = target.id; requesterId = requester.id;
  adminSession = randomBytes(32).toString('base64url');
  requesterSession = randomBytes(32).toString('base64url');
  await prisma.session.createMany({ data: [
    { id: adminSession, userId: adminId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: requesterSession, userId: requesterId, expiresAt: new Date(Date.now() + 3_600_000) },
  ] });
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { id: { in: [adminSession, requesterSession] } } });
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, targetEmail, requesterEmail, `created-${fixture}@example.test`] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 3 Administrator User Management API', () => {
  it('lists users with safe search and role filtering and denies non-admins', async () => {
    const response = await request(app).get(`/api/admin/users?search=${encodeURIComponent('Admin Actor')}&role=ADMINISTRATOR`).set('Cookie', cookie(adminSession));
    expect(response.status).toBe(200);
    expect(response.body.data.users).toEqual([expect.objectContaining({ id: adminId, email: adminEmail, role: 'ADMINISTRATOR' })]);
    expect(response.body.data.users[0]).not.toHaveProperty('passwordHash');
    expect((await request(app).get('/api/admin/users').set('Cookie', cookie(requesterSession))).status).toBe(403);
  });

  it('creates users with normalized email and rejects duplicate or invalid input', async () => {
    const created = await request(app).post('/api/admin/users').set('Cookie', cookie(adminSession)).send({ name: 'Created User', email: `  CREATED-${fixture}@EXAMPLE.TEST `, role: 'IT_STAFF', initialPassword: 'InitialPassword!123' });
    expect(created.status).toBe(201);
    expect(created.body.data.user).toMatchObject({ email: `created-${fixture}@example.test`, role: 'IT_STAFF', isActive: true, mustChangePassword: true });
    expect(created.body.data.user).not.toHaveProperty('passwordHash');
    expect((await request(app).post('/api/admin/users').set('Cookie', cookie(adminSession)).send({ name: 'Duplicate', email: `CREATED-${fixture}@example.test`, role: 'REQUESTER', initialPassword: 'InitialPassword!123' })).status).toBe(409);
    expect((await request(app).post('/api/admin/users').set('Cookie', cookie(adminSession)).send({ name: 'Invalid', email: `invalid-${fixture}@example.test`, role: 'UNKNOWN', initialPassword: 'short' })).status).toBe(400);
  });

  it('edits account fields, deactivates safely, and resets an initial password', async () => {
    const edited = await request(app).patch(`/api/admin/users/${targetId}`).set('Cookie', cookie(adminSession)).send({ name: 'Edited Target', email: targetEmail, role: 'IT_STAFF', isActive: true });
    expect(edited.status).toBe(200);
    expect(edited.body.data.user).toMatchObject({ name: 'Edited Target', role: 'IT_STAFF' });
    const deactivated = await request(app).patch(`/api/admin/users/${targetId}`).set('Cookie', cookie(adminSession)).send({ name: 'Edited Target', email: targetEmail, role: 'IT_STAFF', isActive: false });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.user.isActive).toBe(false);
    const reset = await request(app).post(`/api/admin/users/${targetId}/initial-password`).set('Cookie', cookie(adminSession)).send({ initialPassword: 'ReplacementPassword!123' });
    expect(reset.status).toBe(200);
    expect(reset.body.data.user.mustChangePassword).toBe(true);
    expect((await request(app).patch(`/api/admin/users/${adminId}`).set('Cookie', cookie(adminSession)).send({ name: 'Admin Actor', email: adminEmail, role: 'ADMINISTRATOR', isActive: false })).status).toBe(409);
  });
});
