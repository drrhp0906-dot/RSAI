// ============================================================
// Document credibility sanitizer.
// Guarantees for exported / stored documents:
//  1. No SmartArt / diagram placeholders survive
//  2. No unfilled template markers ("[insert ...]", "TODO", "XXX")
//  3. No AI-cliché scaffolding left in humanized output
//  4. Whitespace / heading levels normalised
// ============================================================

const SMARTART_TOKENS = [
  /\[smartart[^\]]*\]/gi,
  /\[diagram[^\]]*\]/gi,
  /\[chart[^\]]*\]/gi,
  /\[figure placeholder[^\]]*\]/gi,
  /\[insert (diagram|chart|smartart|graphic|image|figure)[^\]]*\]/gi,
  /\b(smartart|process flow|cycle diagram|hierarchy diagram)\b(?![^.]*citation)/gi,
];

const TEMPLATE_TOKENS = [
  /\[insert[^\]]*\]/gi,
  /\[add[^\]]*\]/gi,
  /\[your[^\]]*\]/gi,
  /\b(TODO|FIXME|XXX|TBD)\b/g,
  /\{\{[^}]*\}\}/g,
  /<[a-z-]+placeholder[a-z-]*>/gi,
];

const AI_CLICHE = [
  /\bdelve\s+into\b/gi,
  /\bit is (important|worth) (to note|noting) that\b/gi,
  /\bin conclusion\b/gi,
  /\bfurthermore\b/gi,
  /\bmoreover\b/gi,
  /\bas an ai(?: language model)?\b/gi,
  /\bcertainly[,!]/gi,
  /\bhere (?:is|are) (?:the|a) (?:summary|report|overview)\b/gi,
];

export interface SanitizeResult {
  text: string;
  removedSmartArt: number;
  removedTemplate: number;
}

export function sanitizeDocumentText(input: string): SanitizeResult {
  let text = input ?? "";
  let removedSmartArt = 0;
  let removedTemplate = 0;

  for (const rx of SMARTART_TOKENS) {
    text = text.replace(rx, () => {
      removedSmartArt++;
      return "";
    });
  }
  for (const rx of TEMPLATE_TOKENS) {
    text = text.replace(rx, () => {
      removedTemplate++;
      return "";
    });
  }
  for (const rx of AI_CLICHE) {
    text = text.replace(rx, "");
  }
  // collapse >2 blank lines, strip trailing spaces
  text = text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, removedSmartArt, removedTemplate };
}

/** Strip markdown to plain text (used inside prompts / verifier diffing). */
export function mdToPlain(md: string): string {
  return sanitizeDocumentText(md)
    .text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
