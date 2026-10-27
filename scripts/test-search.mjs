// Pre-flight: verify web_search + image search under bun (pipeline dependencies)
const mod = await import("z-ai-web-dev-sdk");
const zai = await mod.default.create();

console.log("test1: web_search...");
const ws = await zai.functions.invoke("web_search", {
  query: "site:who.int asthma guideline",
  num: 3,
});
const first = Array.isArray(ws) ? ws[0] : null;
console.log("web_search OK, results:", Array.isArray(ws) ? ws.length : typeof ws);
console.log("sample:", JSON.stringify(first ?? null).slice(0, 220));

console.log("test2: image search...");
let imgs = [];
try {
  const res = await zai.images.search.create({ query: "asthma inhaler spirometer diagram", count: 3, rank: true });
  imgs = res?.results ?? [];
} catch (e) {
  console.log("image search error:", e?.message ?? String(e));
}
console.log("image search OK, results:", imgs.length);
if (imgs[0]) {
  console.log("sample keys:", Object.keys(imgs[0]).join(","));
  console.log("original_url:", String(imgs[0].original_url ?? "").slice(0, 120));
}
process.exit(0);
