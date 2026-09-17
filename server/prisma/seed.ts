import "dotenv/config";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive: boolean;
};

async function main() {
  console.log("🌱 Seeding database...");

  const initialPassword = process.env.LAB3_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error("LAB3_INITIAL_PASSWORD must be set before seeding users.");
  }

  // ── Categories (spec Section 7.4) ─────────────────────────────────────────
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // ── Related Systems (spec Section 7.4) ────────────────────────────────────
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`  ✓ ${relatedSystems.length} related systems`);

  // ── Lab 3 users (spec Section 7.4) ───────────────────────────────────────
  // These emails are fixtures only. Initial credentials come from the local
  // environment and are never written to source control.
  const users: SeedUser[] = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", role: "REQUESTER", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: "REQUESTER", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", role: "REQUESTER", isActive: true },
    { name: "Alex Turner", email: "alex.turner@example.com", role: "REQUESTER", isActive: false },
    { name: "Nina Patel", email: "nina.patel@example.com", role: "IT_STAFF", isActive: true },
    { name: "Owen Garcia", email: "owen.garcia@example.com", role: "IT_STAFF", isActive: true },
    { name: "Priya Shah", email: "priya.shah@example.com", role: "IT_STAFF", isActive: true },
    { name: "Quinn Walker", email: "quinn.walker@example.com", role: "IT_STAFF", isActive: false },
    { name: "Morgan Chen", email: "morgan.chen@example.com", role: "ADMINISTRATOR", isActive: true },
  ];

  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    });

    // Existing Lab 2 Requesters have no hash. Backfill them once; later seed
    // runs preserve a User-chosen password and its must-change state.
    const needsPasswordBackfill = !existing?.passwordHash;
    const passwordFields = needsPasswordBackfill
      ? {
          passwordHash: await bcrypt.hash(initialPassword, 12),
          mustChangePassword: true,
        }
      : {};

    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        ...passwordFields,
      },
      create: {
        name: user.name,
        email,
        role: user.role,
        isActive: user.isActive,
        passwordHash: await bcrypt.hash(initialPassword, 12),
        mustChangePassword: true,
      },
    });
  }

  const roleCounts = await prisma.user.groupBy({
    by: ["role", "isActive"],
    _count: { _all: true },
    orderBy: [{ role: "asc" }, { isActive: "desc" }],
  });
  console.log("  ✓ Lab 3 user roles:", roleCounts);

  // ── Ticket workflow fixtures (spec Section 7.4) ──────────────────────────
  // `upsert` preserves a developer's later edits while making a fresh database
  // immediately useful for Queue, Detail, assignment, and collaboration flows.
  const seededUsers = await prisma.user.findMany({
    where: { email: { in: users.map((user) => user.email) } },
    select: { id: true, email: true },
  });
  const userId = new Map(seededUsers.map((user) => [user.email, user.id]));
  const seededCategories = await prisma.category.findMany({ select: { id: true, name: true } });
  const categoryId = new Map(seededCategories.map((category) => [category.name, category.id]));
  const seededSystems = await prisma.relatedSystem.findMany({ select: { id: true, name: true } });
  const systemId = new Map(seededSystems.map((system) => [system.name, system.id]));
  const requester = (email: string) => userId.get(email)!;
  const owner = (email: string | null) => email ? userId.get(email)! : null;

  const tickets = [
    { ticketNumber: "TKT-L3-000001", requesterEmail: "jennifer.anderson@example.com", ownerEmail: null, category: "Network", system: "Campus Wi-Fi", summary: "Cannot connect to campus Wi-Fi", description: "Connection is rejected after sign-in on the main campus network.", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "NEW" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000002", requesterEmail: "michael.brown@example.com", ownerEmail: "nina.patel@example.com", category: "Software", system: "LEB2 App", summary: "LEB2 app opens to a blank screen", description: "The dashboard remains blank after a successful login.", requestedPriority: "MEDIUM" as const, itPriority: "HIGH" as const, currentStatus: "OPEN" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000003", requesterEmail: "sarah.johnson@example.com", ownerEmail: "owen.garcia@example.com", category: "Hardware", system: "Corporate Laptop", summary: "Laptop battery drains while sleeping", description: "Battery falls from full charge to empty overnight in sleep mode.", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "IN_PROGRESS" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000004", requesterEmail: "david.lee@example.com", ownerEmail: "priya.shah@example.com", category: "Account and Access", system: "VPN", summary: "VPN access needs requester information", description: "Additional connection details are needed before troubleshooting can continue.", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "WAITING_FOR_REQUESTER" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000005", requesterEmail: "jennifer.anderson@example.com", ownerEmail: "nina.patel@example.com", category: "Software", system: "Email", summary: "Mailbox sync issue appears fixed", description: "The requester can now receive new messages after diagnostics.", requestedPriority: "LOW" as const, itPriority: "MEDIUM" as const, currentStatus: "RESOLVED" as const, requesterResolvedAt: new Date("2026-09-01T09:00:00.000Z") },
    { ticketNumber: "TKT-L3-000006", requesterEmail: "michael.brown@example.com", ownerEmail: "owen.garcia@example.com", category: "Hardware", system: "Printer", summary: "Printer replacement request completed", description: "The replacement printer is installed and verified.", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "CLOSED" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000007", requesterEmail: "sarah.johnson@example.com", ownerEmail: "priya.shah@example.com", category: "Account and Access", system: "Grade Submission App", summary: "Grade submission access regressed", description: "The previous access fix no longer works for the requester.", requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, currentStatus: "REOPENED" as const, requesterResolvedAt: null },
    { ticketNumber: "TKT-L3-000008", requesterEmail: "david.lee@example.com", ownerEmail: null, category: "Network", system: "VPN", summary: "Duplicate VPN request cancelled", description: "This request duplicates another active VPN ticket.", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "CANCELLED" as const, requesterResolvedAt: null },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      where: { ticketNumber: ticket.ticketNumber },
      update: {},
      create: {
        ticketNumber: ticket.ticketNumber,
        requesterId: requester(ticket.requesterEmail),
        ticketOwnerId: owner(ticket.ownerEmail),
        categoryId: categoryId.get(ticket.category)!,
        relatedSystemId: systemId.get(ticket.system)!,
        summary: ticket.summary,
        description: ticket.description,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        requesterResolvedAt: ticket.requesterResolvedAt,
      },
    });
  }

  const seededTickets = await prisma.ticket.findMany({ where: { ticketNumber: { in: tickets.map((ticket) => ticket.ticketNumber) } }, select: { id: true, ticketNumber: true } });
  const ticketId = new Map(seededTickets.map((ticket) => [ticket.ticketNumber, ticket.id]));
  const collaborationFixtures = [
    { kind: "comment", ticketNumber: "TKT-L3-000002", authorEmail: "michael.brown@example.com", content: "The blank screen happens in both Chrome and Firefox." },
    { kind: "comment", ticketNumber: "TKT-L3-000002", authorEmail: "nina.patel@example.com", content: "Thanks — I am checking the application logs now." },
    { kind: "note", ticketNumber: "TKT-L3-000003", authorEmail: "owen.garcia@example.com", content: "Battery report requested from the device-management console." },
    { kind: "note", ticketNumber: "TKT-L3-000007", authorEmail: "priya.shah@example.com", content: "Reopened after the prior access group change was rolled back." },
  ];
  for (const fixture of collaborationFixtures) {
    const where = { ticketId: ticketId.get(fixture.ticketNumber)!, authorId: userId.get(fixture.authorEmail)!, content: fixture.content };
    if (fixture.kind === "comment") {
      if (!await prisma.publicComment.findFirst({ where })) await prisma.publicComment.create({ data: where });
    } else if (!await prisma.internalNote.findFirst({ where })) {
      await prisma.internalNote.create({ data: where });
    }
  }
  console.log(`  ✓ ${tickets.length} workflow tickets and ${collaborationFixtures.length} collaboration fixtures`);

  console.log("✅ Seeding finished.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
