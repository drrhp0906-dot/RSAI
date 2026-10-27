// Unit test: preservationDefects + enforceApprovedImages logic
import { preservationDefects } from "../src/lib/evidence-pipeline";

// enforceApprovedImages is module-private; replicate its core to test the algorithm shape
function enforce(content: string, approved: string[]) {
  const base = (u: string) => u.split("/").pop() || u;
  let repaired = 0;
  let removed = 0;
  const text = content.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (full, alt: string, url: string) => {
    if (approved.includes(url)) return full;
    const hit = approved.find((a) => base(a) === base(url));
    if (hit) { repaired++; return `![${alt}](${hit})`; }
    removed++;
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), repaired, removed };
}

let failed = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"} - ${name}`);
  if (!cond) failed++;
}

const master = `# M\n\n![fig one](https://x.dev/a/ok1.png)\n\nClaim one [E1] and claim two [E2].\n\nINSTEAD POINT 1\nINSTEAD POINT 2\n`;

// 1: no loss -> no defects
check("clean rewrite passes", preservationDefects(master, master.replace("Claim one", "We found claim one")).length === 0);

// 2: dropped image -> defect
check("image loss detected", preservationDefects(master, master.replace(/!\[fig one\]\([^)]*\)/, "x")).length === 1);

// 3: dropped citation tag -> defect
check("citation tag loss detected", preservationDefects(master, master.replace("[E2]", "")).length === 1);

// 4: dropped instead point -> defect
check("instead-point loss detected", preservationDefects(master, master.replace("INSTEAD POINT 2", "")).length === 1);

// 5: URL repair (typo mcp->mpt)
const approved = ["https://img.assets.example.net/image-search-mcp/images-ppt/d73583e5a519.jpg"];
const r = enforce("before ![f](https://img.assets.example.net/image-search-mpt/images-ppt/d73583e5a519.jpg) after", approved);
check("corrupt URL repaired", r.repaired === 1 && r.text.includes("image-search-mcp/images-ppt/d73583e5a519.jpg"));

// 6: non-approved URL removed
const r2 = enforce("keep ![a](https://img.assets.example.net/image-search-mcp/images-ppt/d73583e5a519.jpg) drop ![b](https://random.site/x/other.jpg)", approved);
check("non-approved ref removed", r2.removed === 1 && !r2.text.includes("other.jpg") && r2.text.includes("d73583e5a519.jpg"));

// 7: approved URL untouched
const r3 = enforce("![a](https://img.assets.example.net/image-search-mcp/images-ppt/d73583e5a519.jpg)", approved);
check("approved untouched", r3.repaired === 0 && r3.removed === 0 && r3.text.includes("d73583e5a519.jpg"));

process.exit(failed ? 1 : 0);
