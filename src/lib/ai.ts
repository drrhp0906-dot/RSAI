import type AiSdk from "z-ai-web-dev-sdk";

// NOTE: the SDK is loaded lazily via dynamic import. A static top-level
// import of this package crashes the Turbopack dev server when the route
// module graph is compiled (process dies silently on first request).
let _sdk: AiSdk | null = null;

export async function getClient(): Promise<AiSdk> {
  if (!_sdk) {
    const mod = await import("z-ai-web-dev-sdk");
    _sdk = await mod.default.create();
  }
  return _sdk;
}

/** Extract the assistant text from a chat completion result. */
export function completionText(res: unknown): string {
  const r = res as { choices?: Array<{ message?: { content?: string } }> };
  return r?.choices?.[0]?.message?.content ?? "";
}

/** Plain text completion (thinking disabled for speed). */
export async function chatText(system: string, user: string, maxTokens = 4000): Promise<string> {
  const client = await getClient();
  const res = await client.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
    max_tokens: maxTokens,
  });
  return completionText(res);
}

/** Parse a JSON object out of an LLM answer (tolerates code fences and prose). */
export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  // strip code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    /* keep trying */
  }
  // grab first {...} or [...] block
  const braceStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  let start = -1;
  let open = "{";
  let close = "}";
  if (braceStart === -1 || (arrStart !== -1 && arrStart < braceStart)) {
    start = arrStart;
    open = "[";
    close = "]";
  } else {
    start = braceStart;
  }
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function chatJson<T>(system: string, user: string, maxTokens = 2500): Promise<T | null> {
  const raw = await chatText(system + "\nRespond with VALID JSON only. No prose, no code fences.", user, maxTokens);
  return parseJsonLoose<T>(raw);
}

/** Web search via the SDK function map. */
export async function webSearch(query: string, num = 5, recencyDays?: number) {
  const client = await getClient();
  const args: { query: string; num: number; recency_days?: number } = { query, num };
  if (recencyDays && recencyDays > 0) args.recency_days = Math.min(recencyDays, 3650);
  const res = await client.functions.invoke("web_search", args);
  return res ?? [];
}

/** Image search via the SDK. */
export async function imageSearch(query: string, count = 6) {
  const client = await getClient();
  try {
    const res = await client.images.search.create({ query, count, rank: true });
    return res?.results ?? [];
  } catch {
    return [];
  }
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
