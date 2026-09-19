import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

afterAll(async () => { await prisma.$disconnect(); await pool.end(); });

describe("Lab 3 migration and seed regression", () => {
  it("retains usable user ownership, tickets, and attachment relationships after the Lab 3 migration", async () => {
    const [activeRequesters, inactiveRequesters, activeStaff, inactiveStaff, activeAdministrators, tickets, attachments] = await Promise.all([
      prisma.user.count({ where: { role: "REQUESTER", isActive: true } }),
      prisma.user.count({ where: { role: "REQUESTER", isActive: false } }),
      prisma.user.count({ where: { role: "IT_STAFF", isActive: true } }),
      prisma.user.count({ where: { role: "IT_STAFF", isActive: false } }),
      prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } }),
      prisma.ticket.findMany({ select: { requesterId: true, ticketOwnerId: true, requester: { select: { id: true, role: true } }, ticketOwner: { select: { id: true, role: true, isActive: true } } } }),
      prisma.attachment.findMany({ select: { ticketId: true, uploaderId: true, ticket: { select: { requesterId: true } }, uploader: { select: { id: true } } } }),
    ]);

    expect(activeRequesters).toBeGreaterThanOrEqual(4);
    expect(inactiveRequesters).toBeGreaterThanOrEqual(1);
    expect(activeStaff).toBeGreaterThanOrEqual(3);
    expect(inactiveStaff).toBeGreaterThanOrEqual(1);
    expect(activeAdministrators).toBeGreaterThanOrEqual(1);
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((ticket) => ticket.requester.role === "REQUESTER" && (!ticket.ticketOwner || (ticket.ticketOwner.role === "IT_STAFF" && ticket.ticketOwner.isActive)))).toBe(true);
    expect(attachments.every((attachment) => attachment.ticketId > 0 && attachment.uploaderId > 0 && attachment.uploader.id === attachment.ticket.requesterId)).toBe(true);
  });
});
