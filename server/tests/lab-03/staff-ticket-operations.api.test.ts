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
const cookie = (session: string) => `toktickit_session=${session}`;

let staffId = 0;
let secondStaffId = 0;
let requesterId = 0;
let administratorId = 0;
let workflowTicketNumber = '';
let requesterTicketNumber = '';
const sessions: string[] = [];
const ticketIds: number[] = [];

const staffEmail = `operations-staff-${fixture}@example.test`;
const secondStaffEmail = `operations-owner-${fixture}@example.test`;
const requesterEmail = `operations-requester-${fixture}@example.test`;
const administratorEmail = `operations-admin-${fixture}@example.test`;
let staffSession = '';
let secondStaffSession = '';
let requesterSession = '';
let administratorSession = '';

beforeAll(async () => {
  const [staff, secondStaff, requester, administrator, category, relatedSystem] = await Promise.all([
    prisma.user.upsert({ where: { email: staffEmail }, update: { name: 'Operations Staff', role: 'IT_STAFF', isActive: true, mustChangePassword: false }, create: { name: 'Operations Staff', email: staffEmail, role: 'IT_STAFF', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: secondStaffEmail }, update: { name: 'Operations Owner', role: 'IT_STAFF', isActive: true, mustChangePassword: false }, create: { name: 'Operations Owner', email: secondStaffEmail, role: 'IT_STAFF', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: requesterEmail }, update: { name: 'Operations Requester', role: 'REQUESTER', isActive: true, mustChangePassword: false }, create: { name: 'Operations Requester', email: requesterEmail, role: 'REQUESTER', isActive: true, mustChangePassword: false } }),
    prisma.user.upsert({ where: { email: administratorEmail }, update: { name: 'Operations Administrator', role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false }, create: { name: 'Operations Administrator', email: administratorEmail, role: 'ADMINISTRATOR', isActive: true, mustChangePassword: false } }),
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.relatedSystem.findFirst({ where: { isActive: true } }),
  ]);
  if (!category || !relatedSystem) throw new Error('Reference seed data is required.');
  staffId = staff.id; secondStaffId = secondStaff.id; requesterId = requester.id; administratorId = administrator.id;
  staffSession = randomBytes(32).toString('base64url');
  secondStaffSession = randomBytes(32).toString('base64url');
  requesterSession = randomBytes(32).toString('base64url');
  administratorSession = randomBytes(32).toString('base64url');
  sessions.push(staffSession, secondStaffSession, requesterSession, administratorSession);
  await prisma.session.createMany({ data: [
    { id: staffSession, userId: staffId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: secondStaffSession, userId: secondStaffId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: requesterSession, userId: requesterId, expiresAt: new Date(Date.now() + 3_600_000) },
    { id: administratorSession, userId: administratorId, expiresAt: new Date(Date.now() + 3_600_000) },
  ] });
  workflowTicketNumber = `OPS-${fixture}`;
  requesterTicketNumber = `OPS-REQUESTER-${fixture}`;
  const created = await prisma.ticket.createManyAndReturn({ data: [
    { ticketNumber: workflowTicketNumber, requesterId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Workflow operation test', description: 'Used to verify assignment, priority, and status operations.', requestedPriority: 'MEDIUM', itPriority: 'MEDIUM', currentStatus: 'NEW' },
    { ticketNumber: requesterTicketNumber, requesterId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: 'Requester resolution test', description: 'Used to verify requester resolution and collaboration rules.', requestedPriority: 'HIGH', itPriority: 'HIGH', currentStatus: 'NEW' },
  ] });
  ticketIds.push(...created.map((ticket) => ticket.id));
});

afterAll(async () => {
  await prisma.internalNote.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ticketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  await prisma.session.deleteMany({ where: { id: { in: sessions } } });
  await prisma.user.deleteMany({ where: { email: { in: [staffEmail, secondStaffEmail, requesterEmail, administratorEmail] } } });
  await prisma.$disconnect();
  await pool.end();
});

describe('Lab 3 IT Staff Ticket Operations API', () => {
  it('lists active owners, retrieves staff detail, claims, assigns, and updates IT Priority', async () => {
    const owners = await request(app).get('/api/staff/owners').set('Cookie', cookie(staffSession));
    expect(owners.status).toBe(200);
    expect(owners.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: staffId, email: staffEmail }),
      expect.objectContaining({ id: secondStaffId, email: secondStaffEmail }),
    ]));

    const detail = await request(app).get(`/api/staff/tickets/${workflowTicketNumber}`).set('Cookie', cookie(staffSession));
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ requester: { id: requesterId }, ticketOwner: null, publicComments: [], internalNotes: [] });
    expect((await request(app).get(`/api/staff/tickets/${workflowTicketNumber}`).set('Cookie', cookie(requesterSession))).status).toBe(403);

    const claim = await request(app).post(`/api/staff/tickets/${workflowTicketNumber}/claim`).set('Cookie', cookie(staffSession));
    expect(claim.status).toBe(200);
    expect(claim.body.data.ticketOwner).toMatchObject({ id: staffId });
    expect((await request(app).post(`/api/staff/tickets/${workflowTicketNumber}/claim`).set('Cookie', cookie(secondStaffSession))).status).toBe(409);

    const assignment = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/owner`).set('Cookie', cookie(staffSession)).send({ ownerId: secondStaffId });
    expect(assignment.status).toBe(200);
    expect(assignment.body.data.ticketOwner).toMatchObject({ id: secondStaffId });
    const invalidOwner = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/owner`).set('Cookie', cookie(staffSession)).send({ ownerId: administratorId });
    expect(invalidOwner.status).toBe(400);
    const unassign = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/owner`).set('Cookie', cookie(staffSession)).send({ ownerId: null });
    expect(unassign.status).toBe(200);
    expect(unassign.body.data.ticketOwner).toBeNull();

    const priority = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/it-priority`).set('Cookie', cookie(staffSession)).send({ itPriority: 'HIGH' });
    expect(priority.status).toBe(200);
    expect(priority.body.data.itPriority).toBe('HIGH');
  });

  it('enforces the formal status transition matrix and confirmation rule', async () => {
    const invalid = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/status`).set('Cookie', cookie(staffSession)).send({ status: 'RESOLVED', confirmed: true });
    expect(invalid.status).toBe(409);

    expect((await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/status`).set('Cookie', cookie(staffSession)).send({ status: 'OPEN' })).status).toBe(200);
    expect((await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/status`).set('Cookie', cookie(staffSession)).send({ status: 'IN_PROGRESS' })).status).toBe(200);
    const confirmationRequired = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/status`).set('Cookie', cookie(staffSession)).send({ status: 'RESOLVED' });
    expect(confirmationRequired.status).toBe(400);
    expect(confirmationRequired.body.error.code).toBe('CONFIRMATION_REQUIRED');
    const resolved = await request(app).patch(`/api/staff/tickets/${workflowTicketNumber}/status`).set('Cookie', cookie(staffSession)).send({ status: 'RESOLVED', confirmed: true });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.currentStatus).toBe('RESOLVED');
  });

  it('records a requester resolution without changing formal status', async () => {
    const response = await request(app).post(`/api/tickets/${requesterTicketNumber}/requester-resolution`).set('Cookie', cookie(requesterSession));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ ticketNumber: requesterTicketNumber, currentStatus: 'NEW' });
    expect(response.body.data.requesterResolvedAt).toBeTruthy();
    expect((await request(app).post(`/api/tickets/${requesterTicketNumber}/requester-resolution`).set('Cookie', cookie(staffSession))).status).toBe(403);
  });

  it('keeps Public Comments append-only and restricts Internal Notes to Staff/Admin visibility', async () => {
    const comment = await request(app).post(`/api/tickets/${requesterTicketNumber}/comments`).set('Cookie', cookie(requesterSession)).send({ content: '  Requester follow-up message.  ' });
    expect(comment.status).toBe(201);
    expect(comment.body.data).toMatchObject({ content: 'Requester follow-up message.', author: { id: requesterId, role: 'REQUESTER' } });
    expect((await request(app).post(`/api/tickets/${requesterTicketNumber}/comments`).set('Cookie', cookie(requesterSession)).send({ content: '   ' })).status).toBe(400);

    const publicComments = await request(app).get(`/api/tickets/${requesterTicketNumber}/comments`).set('Cookie', cookie(staffSession));
    expect(publicComments.status).toBe(200);
    expect(publicComments.body.data).toEqual([expect.objectContaining({ content: 'Requester follow-up message.' })]);
    expect((await request(app).get(`/api/tickets/${requesterTicketNumber}/comments`).set('Cookie', cookie(administratorSession))).status).toBe(200);
    expect((await request(app).post(`/api/tickets/${requesterTicketNumber}/comments`).set('Cookie', cookie(administratorSession)).send({ content: 'Not permitted' })).status).toBe(403);

    const note = await request(app).post(`/api/staff/tickets/${requesterTicketNumber}/notes`).set('Cookie', cookie(staffSession)).send({ content: '  Internal diagnostic note.  ' });
    expect(note.status).toBe(201);
    expect(note.body.data).toMatchObject({ content: 'Internal diagnostic note.', author: { id: staffId, role: 'IT_STAFF' } });
    expect((await request(app).post(`/api/staff/tickets/${requesterTicketNumber}/notes`).set('Cookie', cookie(staffSession)).send({ content: 'x'.repeat(2_001) })).status).toBe(400);
    expect((await request(app).get(`/api/staff/tickets/${requesterTicketNumber}/notes`).set('Cookie', cookie(requesterSession))).status).toBe(403);
    const notesForAdmin = await request(app).get(`/api/staff/tickets/${requesterTicketNumber}/notes`).set('Cookie', cookie(administratorSession));
    expect(notesForAdmin.status).toBe(200);
    expect(notesForAdmin.body.data).toEqual([expect.objectContaining({ content: 'Internal diagnostic note.' })]);
  });
});
