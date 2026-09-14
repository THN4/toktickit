import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { app } from '../../src/index.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const activeEmail = 'auth-api-active@example.test';
const inactiveEmail = 'auth-api-inactive@example.test';
const initialPassword = 'InitialPassword!123';
const replacementPassword = 'ReplacementPassword!123';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(initialPassword, 12);
  await prisma.user.upsert({
    where: { email: activeEmail },
    update: { name: 'Auth API Active', passwordHash, role: 'REQUESTER', isActive: true, mustChangePassword: true },
    create: { name: 'Auth API Active', email: activeEmail, passwordHash, role: 'REQUESTER', isActive: true, mustChangePassword: true },
  });
  await prisma.user.upsert({
    where: { email: inactiveEmail },
    update: { name: 'Auth API Inactive', passwordHash, role: 'REQUESTER', isActive: false, mustChangePassword: true },
    create: { name: 'Auth API Inactive', email: inactiveEmail, passwordHash, role: 'REQUESTER', isActive: false, mustChangePassword: true },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [activeEmail, inactiveEmail] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 3 authentication API', () => {
  it('rejects invalid and inactive credentials without a session', async () => {
    const invalid = await request(app)
      .post('/api/auth/login')
      .send({ email: activeEmail, password: 'wrong-password' });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(invalid.headers['set-cookie']).toBeUndefined();

    const inactive = await request(app)
      .post('/api/auth/login')
      .send({ email: inactiveEmail, password: initialPassword });
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(inactive.headers['set-cookie']).toBeUndefined();
  });

  it('creates a session, returns only safe user data, changes password, and invalidates on logout', async () => {
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: activeEmail.toUpperCase(), password: initialPassword });

    expect(login.status).toBe(200);
    const setCookie = Array.isArray(login.headers['set-cookie'])
      ? login.headers['set-cookie'].join(';')
      : login.headers['set-cookie'] ?? '';
    expect(setCookie).toContain('toktickit_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(login.body.data.user).toMatchObject({ email: activeEmail, role: 'REQUESTER', mustChangePassword: true });
    expect(login.body.data.user).not.toHaveProperty('passwordHash');

    const meBeforeChange = await agent.get('/api/auth/me');
    expect(meBeforeChange.status).toBe(200);
    expect(meBeforeChange.body.data.user.mustChangePassword).toBe(true);

    const changePassword = await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: initialPassword, newPassword: replacementPassword, confirmPassword: replacementPassword });
    expect(changePassword.status).toBe(200);
    expect(changePassword.body.data.user.mustChangePassword).toBe(false);

    const logout = await agent.post('/api/auth/logout').send();
    expect(logout.status).toBe(200);

    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);

    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: activeEmail, password: replacementPassword });
    expect(relogin.status).toBe(200);
  });

  it('rejects state-changing requests from an untrusted browser origin', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://untrusted.example')
      .send({ email: activeEmail, password: replacementPassword });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
