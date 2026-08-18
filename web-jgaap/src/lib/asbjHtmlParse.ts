import type {
  JgaapDocumentKind,
  JgaapObligationLevel,
  JgaapOutlineHeading,
  JgaapParagraphKind,
  SegmentedJgaapParagraph
} from "@/lib/types";

const ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…"
};

export type AsbjHtmlParseResult = {
  standardId: string;
  titleJa: string;
  documentNumberJa: string;
  documentKind: JgaapDocumentKind;
  headings: JgaapOutlineHeading[];
  paragraphs: SegmentedJgaapParagraph[];
  warnings: string[];
};

type HeadingHit = {
  id: string;
  parentId: string | null;
  level: number;
  titleJa: string;
  index: number;
};

function decodeEntities(text: string): string {
  return text
    .replace(/&([a-z]+);/gi, (_, name: string) => ENTITY_MAP[name.toLowerCase()] ?? _)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number.parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCharCode(Number.parseInt(n, 16))
    );
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : "";
}

function normalizeSpaces(text: string): string {
  return text.replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

export function inferDocumentKind(numberLabel: string, titleJa: string): JgaapDocumentKind {
  const blob = `${numberLabel} ${titleJa}`;
  if (/適用指針/.test(blob)) return "GUIDANCE";
  return "STANDARD";
}

export function buildStandardId(numberLabel: string, titleJa: string): string {
  const kind = inferDocumentKind(numberLabel, titleJa);
  const num = numberLabel.match(/第\s*(\d+)\s*号/)?.[1];
  if (num && kind === "GUIDANCE") return `ASBJ-AG ${num}`;
  if (num) return `ASBJ ${num}`;
  const pitf = numberLabel.match(/実務対応報告\s*第\s*(\d+)\s*号/);
  if (pitf) return `PITF ${pitf[1]}`;
  return normalizeSpaces(numberLabel || titleJa).slice(0, 40) || "ASBJ-UNKNOWN";
}

/** ASBJ HTML の data-num（数値項・BC 項・[設例] 等） */
const PARAGRAPH_NUM_PATTERN =
  /^(?:\d+[A-Za-z]?|\d+-\d+|BC\d+|\[設例\d+(?:-\d+)?\])$/;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isValidParagraphNum(num: string): boolean {
  return PARAGRAPH_NUM_PATTERN.test(num);
}

function stripLeadingParagraphLabel(num: string, quoteJa: string): string {
  const escaped = escapeRegex(num);
  return quoteJa
    .replace(new RegExp(`^${escaped}[.．]?\\s*`, "u"), "")
    .replace(/^[.．。]\s*/, "")
    .trim();
}

function inferKind(
  documentKind: JgaapDocumentKind,
  sectionPathJa: string,
  paragraphId: string
): JgaapParagraphKind {
  const compact = sectionPathJa.replace(/\s+/g, "");
  if (compact.includes("結論の背景") || /^BC\d+$/i.test(paragraphId)) return "BACKGROUND";
  if (compact.includes("設例") || /^\[設例/.test(paragraphId)) return "EXAMPLE";
  if (documentKind === "GUIDANCE") return "GUIDANCE";
  return "BODY";
}

const MUST_PATTERN = /しなければならない|するものとする/;
const SHOULD_PATTERN = /すべきである|することが適当である|望ましい/;
const MAY_PATTERN = /してもよい|することができる|することが可能/;

export function inferObligationLevel(
  kind: JgaapParagraphKind,
  quoteJa: string
): JgaapObligationLevel {
  if (kind === "BACKGROUND" || kind === "EXAMPLE") return "EXPLANATORY";
  if (MUST_PATTERN.test(quoteJa)) return "MUST";
  if (SHOULD_PATTERN.test(quoteJa)) return "SHOULD";
  if (MAY_PATTERN.test(quoteJa)) return "MAY";
  return "EXPLANATORY";
}

function extractDocumentMeta(html: string): { numberLabel: string; titleJa: string } {
  const h2 = html.match(/<h2>\s*(?:<span>([\s\S]*?)<\/span>)?\s*([\s\S]*?)<\/h2>/i);
  if (!h2) return { numberLabel: "", titleJa: "" };
  return {
    numberLabel: stripTags(h2[1] ?? ""),
    titleJa: stripTags(h2[2] ?? "")
  };
}

function extractHeadings(html: string): HeadingHit[] {
  const headings: HeadingHit[] = [];
  const re = /<(h[3-6])([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[2] ?? "";
    if (!/detail-heading/i.test(attrs)) continue;
    const id = attr(attrs, "data-row-id") || attr(attrs, "id").replace(/^heading-id-/, "");
    if (!id) continue;
    const parentRaw = attr(attrs, "data-parent-row-id");
    const levelRaw = attr(attrs, "data-head_level") || attr(attrs, "data-head-level");
    headings.push({
      id,
      parentId: parentRaw ? parentRaw : null,
      level: Number.parseInt(levelRaw || "1", 10) || 1,
      titleJa: normalizeSpaces(stripTags(m[3] ?? "")),
      index: m.index
    });
  }
  return headings;
}

function headingPath(headings: HeadingHit[], id: string | null): string {
  if (!id) return "";
  const byId = new Map(headings.map((h) => [h.id, h]));
  const parts: string[] = [];
  const seen = new Set<string>();
  let cur: HeadingHit | undefined = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.titleJa) parts.unshift(cur.titleJa);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.join(" ＞ ");
}

function nearestHeadingId(headings: HeadingHit[], htmlIndex: number): string | null {
  let best: HeadingHit | null = null;
  for (const h of headings) {
    if (h.index < htmlIndex && (!best || h.index > best.index)) best = h;
  }
  return best?.id ?? null;
}

function extractParagraphs(
  html: string,
  headings: HeadingHit[],
  documentKind: JgaapDocumentKind
): { paragraphs: SegmentedJgaapParagraph[]; warnings: string[] } {
  const warnings: string[] = [];
  const found: SegmentedJgaapParagraph[] = [];
  const seen = new Set<string>();
  const re = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  let orderIndex = 0;

  while ((m = re.exec(html))) {
    const attrs = m[1] ?? "";
    const num = attr(attrs, "data-num").trim();
    if (!num) continue;
    if (!isValidParagraphNum(num)) continue;

    const inner = m[2] ?? "";
    const quoteJa = stripLeadingParagraphLabel(num, stripTags(inner));
    if (!quoteJa) continue;

    const parentId = attr(attrs, "data-parent-row-id") || null;
    const headingId =
      headings.some((h) => h.id === parentId) ? parentId : nearestHeadingId(headings, m.index);
    const sectionPathJa = headingPath(headings, headingId);
    const kind = inferKind(documentKind, sectionPathJa, num);

    if (seen.has(num)) {
      warnings.push(`項番号 ${num} が重複したため後着をスキップしました。`);
      continue;
    }
    seen.add(num);

    found.push({
      paragraphId: num,
      kind,
      quoteJa,
      sectionPathJa,
      obligationLevel: inferObligationLevel(kind, quoteJa),
      orderIndex
    });
    orderIndex += 1;
  }

  return { paragraphs: found, warnings };
}

export function parseAsbjHtml(html: string): AsbjHtmlParseResult {
  const warnings: string[] = [];
  const printIdx = html.search(/id=["']print-target["']/i);
  const body = printIdx >= 0 ? html.slice(printIdx) : html;

  const { numberLabel, titleJa } = extractDocumentMeta(body);
  if (!titleJa && !numberLabel) {
    warnings.push("文書タイトル（h2）を抽出できませんでした。");
  }

  const documentKind = inferDocumentKind(numberLabel, titleJa);
  const standardId = buildStandardId(numberLabel, titleJa);
  const headings = extractHeadings(body);
  const parsed = extractParagraphs(body, headings, documentKind);
  warnings.push(...parsed.warnings);

  if (parsed.paragraphs.length === 0) {
    warnings.push("項（data-num）を抽出できませんでした。ASBJ の HTML か確認してください。");
  }

  return {
    standardId,
    titleJa: titleJa || numberLabel || standardId,
    documentNumberJa: numberLabel,
    documentKind,
    headings: headings.map((h) => ({
      id: h.id,
      titleJa: h.titleJa,
      level: h.level,
      parentId: h.parentId
    })),
    paragraphs: parsed.paragraphs,
    warnings
  };
}
