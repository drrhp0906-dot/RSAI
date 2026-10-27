import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: ["query"] });

const step = await db.pipelineStep.findFirst();
console.log("step:", step?.runId, step?.key);

try {
  const res = await db.pipelineStep.updateMany({
    where: { runId: step.runId, key: step.key },
    data: {
      status: "done",
      detail: "test " + "x".repeat(3000),
      outputJson: JSON.stringify({ chosen: [{ domain: "ginasthma.org", reason: "asthma" }], revisedQuery: "test", searchTerms: ["a", "b"] }),
    },
  });
  console.log("updateMany OK:", res.count);
} catch (e) {
  console.log("FAILED:", e?.message?.slice(0, 1200));
}

// also test a long detail like the router produces
try {
  const res = await db.pipelineStep.updateMany({
    where: { runId: step.runId, key: step.key },
    data: {
      status: "running",
      detail: "Selected 6 platforms: GINA (Asthma), NHLBI, NICE (UK), Cochrane Library, PubMed, WHO",
      outputJson: JSON.stringify({ revisedQuery: "asthma management", searchTerms: ["asthma stepwise", "GINA report"], chosen: new Array(6).fill({ domain: "ginasthma.org", reason: "asthma guideline body with yearly updates" }) }),
    },
  });
  console.log("updateMany2 OK:", res.count);
} catch (e) {
  console.log("FAILED2:", e?.message?.slice(0, 1200));
}

await db.$disconnect();
