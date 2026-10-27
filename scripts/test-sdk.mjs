console.log("step1: importing SDK...");
const mod = await import("z-ai-web-dev-sdk");
console.log("step2: imported, calling create()...");
const sdk = await mod.default.create();
console.log("step3: created OK, calling tiny chat...");
const res = await sdk.chat.completions.create({
  messages: [{ role: "user", content: "Reply with the single word: OK" }],
  thinking: { type: "disabled" },
  max_tokens: 10,
});
console.log("step4: chat responded:", JSON.stringify(res?.choices?.[0]?.message?.content ?? "").slice(0, 80));
process.exit(0);
