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
const requesterAEmail = 'regression-requester-a@example.test';
const requesterBEmail = 'regression-requester-b@example.test';
let requesterAId = 0;
let sessionA = '';
let sessionB = '';
let ticketNumber = '';
let attachmentId = 0;

const cookie = (id: string) => `toktickit_session=${id}`;

beforeAll(async () => {
  const [requesterA, requesterB, category, relatedSystem] = await Promise.all([
    prisma.user.upsert({ where: { email: requesterAEmail }, update: { name: 'Regression Requester A', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Regression Requester A', email: requesterAEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: requesterBEmail }, update: { name: 'Regression Requester B', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Regression Requester B', email: requesterBEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.relatedSystem.findFirst({ where: { isActive: true } }),
  ]);
  if (!category || !relatedSystem) throw new Error('Seeded Category and Related System are required for requester regression tests.');
  requesterAId = requesterA.id;
  sessionA = randomBytes(32).toString('base64url');
  sessionB = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.session.createMany({ data: [{ id: sessionA, userId: requesterA.id, expiresAt }, { id: sessionB, userId: requesterB.id, expiresAt }] });

  const created = await request(app).post('/api/tickets').set('Cookie', cookie(sessionA)).send({
    categoryId: category.id,
    relatedSystemId: relatedSystem.id,
    requestedPriority: 'MEDIUM',
    summary: 'Lab 3 authenticated requester regression',
    description: 'A ticket created through the authenticated Requester session for regression testing.',
  });
  if (created.status !== 201) throw new Error(`Unable to create regression Ticket: ${JSON.stringify(created.body)}`);
  ticketNumber = created.body.data.ticketNumber;
});

afterAll(async () => {
  if (attachmentId) await prisma.attachment.deleteMany({ where: { id: attachmentId } });
  if (ticketNumber) await prisma.ticket.deleteMany({ where: { ticketNumber } });
  await prisma.session.deleteMany({ where: { id: { in: [sessionA, sessionB] } } });
  await prisma.user.deleteMany({ where: { email: { in: [requesterAEmail, requesterBEmail] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 3 Requester regression through authenticated identity', () => {
  it('creates a Ticket for the session Requester and rejects client identity', async () => {
    const ticket = await request(app).get(`/api/tickets/${ticketNumber}`).set('Cookie', cookie(sessionA));
    expect(ticket.status).toBe(200);
    expect(ticket.body.data.requesterId).toBe(requesterAId);

    const spoofed = await request(app).get(`/api/tickets?requesterId=999999`).set('Cookie', cookie(sessionA));
    expect(spoofed.status).toBe(400);
    expect(spoofed.body.error.code).toBe('CLIENT_IDENTITY_NOT_ALLOWED');
  });

  it('lists only the authenticated Requester data and hides another Requester Ticket', async () => {
    const own = await request(app).get('/api/tickets').set('Cookie', cookie(sessionA));
    expect(own.status).toBe(200);
    expect(own.body.data.tickets.some((ticket: { ticketNumber: string }) => ticket.ticketNumber === ticketNumber)).toBe(true);

    const other = await request(app).get(`/api/tickets/${ticketNumber}`).set('Cookie', cookie(sessionB));
    expect(other.status).toBe(404);
    expect(other.body.error.code).toBe('NOT_FOUND');
  });

  it('preserves attachment ownership through the authenticated session', async () => {
    const uploaded = await request(app)
      .post(`/api/tickets/${ticketNumber}/attachments`)
      .set('Cookie', cookie(sessionA))
      .attach('file', Buffer.from('%PDF-1.4 regression'), { filename: 'evidence.pdf', contentType: 'application/pdf' });
    expect(uploaded.status).toBe(201);
    attachmentId = uploaded.body.data.id;
    expect(uploaded.body.data.uploaderId).toBe(requesterAId);

    const otherDownload = await request(app).get(`/api/attachments/${attachmentId}/download`).set('Cookie', cookie(sessionB));
    expect(otherDownload.status).toBe(404);
    expect(otherDownload.body.error.code).toBe('NOT_FOUND');

    const removed = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Cookie', cookie(sessionA))
      .send({ removalReason: 'Regression test cleanup.' });
    expect(removed.status).toBe(200);
    expect(removed.body.data.removedByRequesterId).toBe(requesterAId);
  });
});
