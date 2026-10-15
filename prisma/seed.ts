/**
 * BuildFlow demo seed.
 *
 * Creates one demo company ("Demo Builders Co.") with four users, two
 * clients, and three projects carrying schedule items, to-dos, daily logs,
 * budget items, an estimate, a change order, selections, messages, and a few
 * placeholder file records.
 *
 * Idempotent: if the demo company already exists, the seed exits quietly.
 *
 * Demo logins (password for all): demo1234
 *   owner@demo.local · manager@demo.local · sub@demo.local · client@demo.local
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEMO_PASSWORD = "demo1234";

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  const existing = await db.company.findFirst({
    where: { name: "Demo Builders Co." },
  });
  if (existing) {
    console.log("Demo data already present — skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const company = await db.company.create({
    data: { name: "Demo Builders Co." },
  });

  const owner = await db.user.create({
    data: {
      companyId: company.id,
      email: "owner@demo.local",
      name: "Olivia Owner",
      role: "OWNER",
      passwordHash,
    },
  });
  const manager = await db.user.create({
    data: {
      companyId: company.id,
      email: "manager@demo.local",
      name: "Marcus Manager",
      role: "MANAGER",
      passwordHash,
    },
  });
  const sub = await db.user.create({
    data: {
      companyId: company.id,
      email: "sub@demo.local",
      name: "Sam Subcontractor",
      role: "SUBCONTRACTOR",
      passwordHash,
    },
  });
  const clientUser = await db.user.create({
    data: {
      companyId: company.id,
      email: "client@demo.local",
      name: "Casey Client",
      role: "CLIENT",
      passwordHash,
    },
  });

  const casey = await db.client.create({
    data: {
      companyId: company.id,
      userId: clientUser.id,
      name: "Casey Client",
      email: "client@demo.local",
      phone: "555-0142",
      address: "482 Maple Street, Springfield",
    },
  });
  const jordan = await db.client.create({
    data: {
      companyId: company.id,
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
      phone: "555-0119",
      address: "77 Oak Avenue, Springfield",
    },
  });

  /* ------------------------- Project 1: full demo ------------------------- */
  const p1 = await db.project.create({
    data: {
      companyId: company.id,
      clientId: casey.id,
      name: "Maple Street Residence",
      address: "482 Maple Street, Springfield",
      status: "ACTIVE",
      startDate: new Date("2026-08-10T09:00:00"),
      endDate: new Date("2027-02-28T17:00:00"),
      budget: 485000,
      description:
        "Two-story custom home: four bedrooms, three and a half baths, attached two-car garage, full basement.",
    },
  });

  const p1Schedule: Array<{
    title: string;
    startIn: number;
    endIn: number;
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
    assignee?: string;
  }> = [
    { title: "Foundation pour", startIn: -60, endIn: -58, status: "COMPLETED", assignee: sub.id },
    { title: "Framing — first floor", startIn: -45, endIn: -30, status: "COMPLETED", assignee: sub.id },
    { title: "Framing — second floor", startIn: -28, endIn: -12, status: "COMPLETED" },
    { title: "Roofing", startIn: -10, endIn: -2, status: "IN_PROGRESS", assignee: sub.id },
    { title: "Rough electrical", startIn: 1, endIn: 6, status: "SCHEDULED", assignee: manager.id },
    { title: "Rough plumbing", startIn: 3, endIn: 9, status: "SCHEDULED" },
    { title: "HVAC rough-in", startIn: 8, endIn: 14, status: "SCHEDULED" },
    { title: "Insulation & drywall", startIn: 16, endIn: 28, status: "SCHEDULED" },
  ];
  for (const s of p1Schedule) {
    await db.scheduleItem.create({
      data: {
        projectId: p1.id,
        title: s.title,
        startDate: daysFromNow(s.startIn),
        endDate: daysFromNow(s.endIn),
        status: s.status,
        assignedToId: s.assignee,
      },
    });
  }

  const p1Todos = [
    { title: "Confirm window delivery date", priority: "HIGH" as const, status: "OPEN" as const, dueIn: 2, assignee: manager.id },
    { title: "Re-stake silt fence on north side", priority: "MEDIUM" as const, status: "IN_PROGRESS" as const, dueIn: 1, assignee: sub.id },
    { title: "Approve cabinet shop drawings", priority: "URGENT" as const, status: "OPEN" as const, dueIn: 4 },
    { title: "Schedule rough-in inspections", priority: "MEDIUM" as const, status: "OPEN" as const, dueIn: 7, assignee: manager.id },
    { title: "Backfill foundation", priority: "LOW" as const, status: "DONE" as const, dueIn: -55, assignee: sub.id },
  ];
  for (const t of p1Todos) {
    await db.todo.create({
      data: {
        projectId: p1.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: daysFromNow(t.dueIn),
        assignedToId: t.assignee,
        createdById: manager.id,
      },
    });
  }

  const logNotes = [
    "Roofing crew on site — shingles 60% complete on south slope. Sunny, light wind.",
    "Framing punch list walkthrough with Marcus. Two window openings need reframing.",
    "Delivered trusses for garage. Crane on site 8–11am. No incidents.",
  ];
  for (let i = 0; i < 3; i++) {
    await db.dailyLog.create({
      data: {
        projectId: p1.id,
        date: daysFromNow(-i),
        weather: ["Sunny, 68°F", "Partly cloudy, 64°F", "Overcast, 58°F"][i],
        workersOnSite: [9, 7, 11][i],
        hoursWorked: [72, 56, 88][i],
        notes: logNotes[i],
        createdById: manager.id,
      },
    });
  }

  const p1Budget = [
    { category: "Site Work", name: "Excavation & grading", estimatedCost: 18500, actualCost: 19200 },
    { category: "Foundation", name: "Poured foundation & waterproofing", estimatedCost: 42000, actualCost: 41500 },
    { category: "Framing", name: "Lumber package & labor", estimatedCost: 98000, actualCost: 101500 },
    { category: "Roofing", name: "Shingles, underlayment, flashing", estimatedCost: 34000, actualCost: 12000 },
    { category: "Electrical", name: "Rough & finish electrical", estimatedCost: 28000, actualCost: 0 },
    { category: "Plumbing", name: "Rough & finish plumbing", estimatedCost: 31000, actualCost: 0 },
    { category: "Finishes", name: "Cabinets, trim, paint allowance", estimatedCost: 65000, actualCost: 0 },
  ];
  for (const b of p1Budget) {
    await db.budgetItem.create({ data: { projectId: p1.id, ...b } });
  }

  const estimate = await db.estimate.create({
    data: {
      projectId: p1.id,
      number: "EST-001",
      title: "Base construction estimate — Maple Street Residence",
      status: "APPROVED",
      validUntil: daysFromNow(30),
      notes: "Includes allowances for lighting and plumbing fixtures.",
    },
  });
  const estimateLines = [
    { description: "General conditions & supervision", quantity: 1, unitPrice: 28000, position: 0 },
    { description: "Site work & excavation", quantity: 1, unitPrice: 18500, position: 1 },
    { description: "Foundation", quantity: 1, unitPrice: 42000, position: 2 },
    { description: "Framing labor & materials", quantity: 2400, unitPrice: 42.5, position: 3 },
    { description: "Roofing", quantity: 32, unitPrice: 1062.5, position: 4 },
    { description: "Electrical", quantity: 1, unitPrice: 28000, position: 5 },
    { description: "Plumbing", quantity: 1, unitPrice: 31000, position: 6 },
    { description: "HVAC", quantity: 1, unitPrice: 24000, position: 7 },
    { description: "Finishes allowance", quantity: 1, unitPrice: 65000, position: 8 },
  ];
  for (const line of estimateLines) {
    await db.estimateLine.create({ data: { estimateId: estimate.id, ...line } });
  }

  await db.changeOrder.create({
    data: {
      projectId: p1.id,
      number: "CO-001",
      title: "Upgrade to standing-seam metal accent roof",
      description:
        "Client requested standing-seam metal on the front porch roof in place of asphalt shingles. Adds material cost and one extra day of labor.",
      amount: 6800,
      status: "PENDING",
    },
  });

  const p1Selections = [
    { category: "Exterior", title: "Roof shingle color", description: "Architectural shingles — options: weathered wood, charcoal, slate.", status: "APPROVED" as const },
    { category: "Kitchen", title: "Cabinet style & finish", description: "Shaker-style, painted white uppers with stained island.", status: "PENDING" as const },
    { category: "Bathrooms", title: "Tile selection", description: "Primary bath: 12x24 porcelain; hall bath: subway tile.", status: "PENDING" as const },
    { category: "Flooring", title: "Hardwood species", description: "White oak, natural finish, 5-inch planks.", status: "APPROVED" as const },
  ];
  for (const s of p1Selections) {
    await db.selection.create({
      data: {
        projectId: p1.id,
        category: s.category,
        title: s.title,
        description: s.description,
        status: s.status,
        ...(s.status === "APPROVED"
          ? { decidedById: clientUser.id, decidedAt: daysFromNow(-6) }
          : {}),
      },
    });
  }

  const p1Messages = [
    { senderId: manager.id, body: "Welcome to your project portal, Casey! I'll post weekly progress updates here. Roofing wraps up this week.", atDaysAgo: 6 },
    { senderId: clientUser.id, body: "Thanks Marcus! The framing looks great. Quick question — when do we need to finalize the cabinet selection?", atDaysAgo: 5 },
    { senderId: manager.id, body: "Cabinet shop drawings are due back Thursday. If you can approve the style by Wednesday we'll stay on schedule.", atDaysAgo: 4 },
    { senderId: sub.id, body: "Roofing at 60% — south slope done, starting north slope tomorrow morning.", atDaysAgo: 1 },
  ];
  for (const m of p1Messages) {
    await db.message.create({
      data: {
        projectId: p1.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: daysFromNow(-m.atDaysAgo),
      },
    });
  }

  // Placeholder file records (no binary content — the files page handles these
  // gracefully and real uploads replace them in practice).
  const p1Files = [
    { originalName: "floor-plan-v3.pdf", category: "PLAN" as const, mimeType: "application/pdf" },
    { originalName: "kitchen-elevation.pdf", category: "PLAN" as const, mimeType: "application/pdf" },
    { originalName: "framing-progress-oct.jpg", category: "PHOTO" as const, mimeType: "image/jpeg" },
    { originalName: "roofing-south-slope.jpg", category: "PHOTO" as const, mimeType: "image/jpeg" },
    { originalName: "contract-signed.pdf", category: "DOCUMENT" as const, mimeType: "application/pdf" },
  ];
  for (const f of p1Files) {
    await db.projectFile.create({
      data: {
        projectId: p1.id,
        originalName: f.originalName,
        storedPath: `seed/${f.originalName}`,
        size: 0,
        mimeType: f.mimeType,
        category: f.category,
        uploadedById: manager.id,
      },
    });
  }

  /* ----------------------- Project 2: Oak Avenue Remodel ---------------------- */
  const p2 = await db.project.create({
    data: {
      companyId: company.id,
      clientId: jordan.id,
      name: "Oak Avenue Remodel",
      address: "77 Oak Avenue, Springfield",
      status: "ACTIVE",
      startDate: new Date("2026-09-21T09:00:00"),
      endDate: new Date("2026-12-18T17:00:00"),
      budget: 120000,
      description:
        "Main-floor remodel: kitchen expansion, new mudroom, refinished hardwoods.",
    },
  });

  for (const s of [
    { title: "Demolition", startIn: -24, endIn: -20, status: "COMPLETED" as const },
    { title: "Kitchen rough-in", startIn: -6, endIn: 2, status: "IN_PROGRESS" as const, assignee: sub.id },
    { title: "Cabinet install", startIn: 5, endIn: 10, status: "SCHEDULED" as const },
    { title: "Countertop template & install", startIn: 12, endIn: 19, status: "SCHEDULED" as const },
  ]) {
    await db.scheduleItem.create({
      data: {
        projectId: p2.id,
        title: s.title,
        startDate: daysFromNow(s.startIn),
        endDate: daysFromNow(s.endIn),
        status: s.status,
        assignedToId: s.assignee,
      },
    });
  }
  for (const t of [
    { title: "Protect hardwood floors in living room", priority: "HIGH" as const, dueIn: 0 },
    { title: "Order range hood — 6 week lead time", priority: "URGENT" as const, dueIn: 1 },
    { title: "Patch drywall in mudroom", priority: "MEDIUM" as const, dueIn: 3 },
  ]) {
    await db.todo.create({
      data: {
        projectId: p2.id,
        title: t.title,
        priority: t.priority,
        dueDate: daysFromNow(t.dueIn),
        createdById: owner.id,
      },
    });
  }
  await db.dailyLog.create({
    data: {
      projectId: p2.id,
      date: daysFromNow(0),
      weather: "Indoor work — N/A",
      workersOnSite: 4,
      hoursWorked: 32,
      notes: "Kitchen demo complete. Electrical rough-in started on east wall.",
      createdById: sub.id,
    },
  });
  for (const b of [
    { category: "Demolition", name: "Demo & disposal", estimatedCost: 6500, actualCost: 6800 },
    { category: "Kitchen", name: "Cabinets", estimatedCost: 28000, actualCost: 0 },
    { category: "Kitchen", name: "Countertops", estimatedCost: 9500, actualCost: 0 },
    { category: "Flooring", name: "Refinish hardwoods", estimatedCost: 7200, actualCost: 0 },
  ]) {
    await db.budgetItem.create({ data: { projectId: p2.id, ...b } });
  }

  /* ------------------------- Project 3: lead ------------------------- */
  await db.project.create({
    data: {
      companyId: company.id,
      name: "Pine Ridge Custom Home",
      address: "12 Pine Ridge Lane, Springfield",
      status: "LEAD",
      startDate: new Date("2027-03-01T09:00:00"),
      budget: 620000,
      description:
        "Prospective hillside custom home. Awaiting signed contract before scheduling.",
    },
  });

  console.log("Demo seed complete.");
  console.log("Logins (password for all: demo1234):");
  console.log("  owner@demo.local / manager@demo.local / sub@demo.local / client@demo.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
