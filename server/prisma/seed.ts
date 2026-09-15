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

  console.log("✅ Seeding finished.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
