// Inspect image search result fields to find the real origin domain
const mod = await import("z-ai-web-dev-sdk");
const sdk = await mod.default.create();
const res = await sdk.images.search.create({ query: "WHO asthma stepwise management chart", count: 5, rank: true });
for (const r of (res?.results ?? []).slice(0, 5)) {
  console.log(JSON.stringify({ original_url: String(r.original_url).slice(0, 90), source: r.source, caption: String(r.caption ?? "").slice(0, 60), w: r.original_width, h: r.original_height }));
}
process.exit(0);
