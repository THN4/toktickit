import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
afterAll(async () => { await prisma.$disconnect(); await pool.end(); });

describe('Lab 4 additive migration and seed regression', () => {
  it('retains legacy tickets, requesters, owners, and unknown resolution times', async () => {
    const tickets = await prisma.ticket.findMany({ where: { ticketNumber: { startsWith: 'TKT-L3-' } }, include: { requester: true, ticketOwner: true, actionsTaken: true }, orderBy: { ticketNumber: 'asc' } });
    expect(tickets).toHaveLength(8);
    expect(tickets.every((ticket) => ticket.version >= 1 && ticket.requester.role === 'REQUESTER')).toBe(true);
    expect(tickets.every((ticket) => !ticket.ticketOwner || ticket.ticketOwner.role === 'IT_STAFF')).toBe(true);
    expect(tickets.find((ticket) => ticket.ticketNumber === 'TKT-L3-000001')?.actionsTaken).toHaveLength(0);
    expect(tickets.find((ticket) => ticket.ticketNumber === 'TKT-L3-000005')?.resolvedAt).toBeNull();
    expect(tickets.find((ticket) => ticket.ticketNumber === 'TKT-L3-000006')?.resolvedAt).toBeNull();
  });

  it('seeds stable, linked actions without duplicate retry IDs or missing audit events', async () => {
    const fixtureIds = [1, 2, 3, 4, 5].map((number) => `00000000-0000-4000-8000-00000000040${number}`);
    const actions = await prisma.actionTaken.findMany({ where: { clientRequestId: { in: fixtureIds } }, include: { ticket: true, createdBy: true, events: true } });
    expect(actions).toHaveLength(5);
    expect(new Set(actions.map((action) => action.clientRequestId)).size).toBe(5);
    expect(actions.every((action) => action.ticket.ticketNumber.startsWith('TKT-L3-') && action.createdBy.isActive && action.events.length >= 1)).toBe(true);
    expect(new Set(actions.map((action) => action.status))).toEqual(new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']));
  });
});
