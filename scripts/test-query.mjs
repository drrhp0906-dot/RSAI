import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const runs = await db.researchRun.findMany({
  orderBy: { createdAt: "desc" },
  take: 30,
  select: {
    id: true, query: true, status: true, yearFrom: true, yearTo: true,
    currentStep: true, createdAt: true,
    _count: { select: { evidences: true, images: true, flags: true, reports: true } },
  },
});
console.log("aggregate query OK, runs:", runs.length);
await db.$disconnect();
