/**
 * Detached pipeline worker.
 *
 * The z-ai-web-dev-sdk runtime kills the `next dev` node process when its
 * API calls run inside the Next.js server (silent hard crash, no output).
 * The SDK works flawlessly under plain bun/node (verified standalone), so
 * the pipeline runs in this separate detached process instead.
 *
 * Usage: bun scripts/pipeline-worker.ts <runId>
 * The worker updates the shared SQLite database and exits when done.
 */

import { runPipeline } from "../src/lib/evidence-pipeline";
import { db } from "../src/lib/db";

const runId = process.argv[2];

if (!runId) {
  console.error("usage: bun scripts/pipeline-worker.ts <runId>");
  process.exit(1);
}

async function markFail(message: string) {
  try {
    await db.researchRun.update({ where: { id: runId }, data: { status: "error", error: message.slice(0, 800) } });
  } catch {
    /* db may be unavailable */
  }
}

process.on("unhandledRejection", async (reason) => {
  console.error("[worker] unhandledRejection:", reason);
  await markFail(`Worker unhandledRejection: ${String(reason).slice(0, 500)}`);
  process.exit(1);
});

process.on("uncaughtException", async (err) => {
  console.error("[worker] uncaughtException:", err);
  await markFail(`Worker uncaughtException: ${String(err?.message ?? err).slice(0, 500)}`);
  process.exit(1);
});

console.log(`[worker] starting pipeline for run ${runId} (pid ${process.pid})`);

const timeout = setTimeout(
  () => {
    console.error("[worker] global timeout (15 min) reached");
    void markFail("Pipeline exceeded the 15 minute limit and was stopped.");
    process.exit(1);
  },
  15 * 60 * 1000,
);
timeout.unref();

runPipeline(runId)
  .then(() => {
    console.log(`[worker] pipeline finished for run ${runId}`);
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[worker] pipeline failed:", err);
    await markFail(`Worker error: ${String(err?.message ?? err).slice(0, 500)}`);
    process.exit(1);
  });
