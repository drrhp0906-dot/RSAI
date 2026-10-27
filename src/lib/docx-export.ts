// ============================================================
// Markdown -> .docx exporter.
// Credibility guarantees enforced here:
//  - ONLY plain flow content: headings, paragraphs, lists,
//    tables and embedded images. No SmartArt / text boxes /
//    shapes are ever emitted (sanitizer strips their markers).
//  - Template placeholders are removed before export.
//  - Unreachable images degrade to a caption note, never a
//    broken reference.
// ============================================================

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import sharp from "sharp";
import { sanitizeDocumentText } from "@/lib/sanitize";

const MAX_IMG_BYTES = 4 * 1024 * 1024;

/** Magic-byte sniffing: only formats Word renders natively are accepted. */
function sniffImageType(buf: Uint8Array): "png" | "jpg" | "gif" | "bmp" | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  return null;
}

interface InlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
}

/** Parse **bold** and *italic* inline markdown into TextRun specs. */
function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const rx = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) runs.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith("`")) runs.push({ text: tok.slice(1, -1) });
    else runs.push({ text: tok.slice(1, -1), italics: true });
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}

function mdRuns(text: string): TextRun[] {
  return parseInline(text).map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italics, size: 22 }));
}

function heading(text: string, hashes: number): Paragraph {
  const level = Math.min(4, Math.max(1, hashes));
  const map = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
  return new Paragraph({ heading: map[level - 1], children: parseInline(text).map((r) => new TextRun({ text: r.text, bold: true })) });
}

async function fetchImage(url: string): Promise<{ data: Uint8Array; type: "png" | "jpg" | "gif" | "bmp"; w: number; h: number } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMG_BYTES || buf.byteLength < 64) return null;
    const kind = sniffImageType(buf);
    if (!kind) return null; // webp/svg etc. degrade to a caption note below
    let w = 550;
    let h = 340;
    try {
      const meta = await sharp(Buffer.from(buf)).metadata();
      if (meta.width && meta.height && meta.width > 0 && meta.height > 0) {
        w = meta.width;
        h = meta.height;
      }
    } catch {
      // keep safe defaults
    }
    return { data: buf, type: kind, w, h };
  } catch {
    return null;
  }
}

export async function markdownToDocx(params: {
  title: string;
  subtitle: string;
  markdown: string;
  footerNote?: string;
}): Promise<Buffer> {
  const { text: sanitized, removedSmartArt, removedTemplate } = sanitizeDocumentText(params.markdown);
  const lines = sanitized.split("\n");

  const children: Array<Paragraph | Table> = [];
  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: params.title, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: params.subtitle, italics: true, size: 20, color: "666666" })] }),
  );

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // table block
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const block: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        block.push(lines[i]);
        i++;
      }
      const rows = block
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map((l) =>
          l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()),
        );
      if (rows.length) {
        const nCols = Math.max(...rows.map((r) => r.length));
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map(
            (cells, ri) =>
              new TableRow({
                children: Array.from({ length: nCols }, (_, ci) => {
                  const cellText = cells[ci] ?? "";
                  return new TableCell({
                    children: [new Paragraph({ children: mdRuns(cellText) })],
                  });
                }),
              }),
          ),
        });
        children.push(table, new Paragraph({ text: "" }));
      }
      continue;
    }

    // image (optionally bulleted/numbered, optionally followed by a credibility caption after the URL)
    const img = line.match(/^\s*(?:(?:[-*]|\d+\.)\s*)?!\[([^\]]*)\]\(([^)\s]+)\)\s*(.*)$/);
    if (img) {
      const alt = img[1] || "figure";
      const url = img[2];
      const trailing = img[3].replace(/^\s*[-\u2013\u2014]+\s*/, "").trim();
      const caption = [alt, trailing].filter(Boolean).join(" - ");
      const fetched = await fetchImage(url);
      if (fetched) {
        // scale to a target width of 480, preserving the real aspect ratio
        let targetW = 480;
        let targetH = Math.max(1, Math.round((fetched.h / fetched.w) * targetW));
        if (targetH > 620) {
          targetH = 620;
          targetW = Math.max(1, Math.round((fetched.w / fetched.h) * targetH));
        }
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            children: [new ImageRun({ type: fetched.type, data: fetched.data, transformation: { width: targetW, height: targetH } })],
          }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `Figure: ${caption}`, italics: true, size: 18, color: "555555" })] }),
        );
      } else {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: `Figure (source unreachable at export time, omitted): ${caption}`, italics: true, size: 18, color: "996600" })],
          }),
        );
      }
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      children.push(heading(h[2], h[1].length));
      i++;
      continue;
    }

    // bullet
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: mdRuns(bullet[1]) }));
      i++;
      continue;
    }

    // blockquote
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      children.push(new Paragraph({ indent: { left: 360 }, spacing: { before: 60, after: 60 }, children: [new TextRun({ text: quote[1], italics: true, color: "555555", size: 22 })] }));
      i++;
      continue;
    }

    // horizontal rule / blank
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) || line.trim() === "") {
      i++;
      continue;
    }

    // numbered / plain paragraph (number kept literally for audit fidelity)
    children.push(new Paragraph({ spacing: { after: 100 }, children: mdRuns(line.trim()) }));
    i++;
  }

  children.push(
    new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `Document credibility ledger: ${removedSmartArt} SmartArt/diagram placeholder(s) removed, ${removedTemplate} template marker(s) removed. Export contains plain text, tables and vetted images only - no SmartArt objects are used in this document.`, italics: true, size: 18, color: "777777" })] }),
  );
  if (params.footerNote) {
    children.push(new Paragraph({ children: [new TextRun({ text: params.footerNote, italics: true, size: 18, color: "777777" })] }));
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
