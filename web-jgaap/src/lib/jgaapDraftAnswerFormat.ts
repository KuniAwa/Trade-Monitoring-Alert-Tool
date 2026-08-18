import type { JgaapCitation, JgaapDraftAnswerStructured, JgaapParagraphKind } from "@/lib/types";
import { NON_NORMATIVE_PARAGRAPH_KINDS } from "@/lib/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function extractJsonObject(raw: string): string {
  const t = raw.trim();
  const block = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();
  return t;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

const PARAGRAPH_KINDS = new Set<string>(["BODY", "GUIDANCE", "BACKGROUND", "EXAMPLE"]);

function parseCitation(r: unknown): JgaapCitation | null {
  if (!isRecord(r)) return null;
  const standardId = String(r.standardId ?? "").trim();
  const paragraphId = String(r.paragraphId ?? "").trim();
  const kindRaw = String(r.kind ?? "BODY").toUpperCase();
  const kind = PARAGRAPH_KINDS.has(kindRaw) ? (kindRaw as JgaapParagraphKind) : "BODY";
  const quoteJa = String(r.quoteJa ?? "").trim();
  if (!standardId || !paragraphId || !quoteJa) return null;
  return { standardId, paragraphId, kind, quoteJa };
}

function normalizeStructured(parsed: Record<string, unknown>): JgaapDraftAnswerStructured {
  const optionsRaw = Array.isArray(parsed.options) ? parsed.options : [];
  const options = optionsRaw.map((o, i) => {
    const obj = isRecord(o) ? o : {};
    return {
      id: typeof obj.id === "string" ? obj.id : String.fromCharCode(65 + i),
      titleJa:
        typeof obj.titleJa === "string"
          ? obj.titleJa
          : typeof obj.title === "string"
            ? obj.title
            : `選択肢 ${i + 1}`,
      descriptionJa:
        typeof obj.descriptionJa === "string"
          ? obj.descriptionJa
          : typeof obj.description === "string"
            ? obj.description
            : undefined,
      conditionsJa: asStringArray(obj.conditionsJa).length
        ? asStringArray(obj.conditionsJa)
        : asStringArray(obj.conditions),
      advantagesJa: asStringArray(obj.advantagesJa).length
        ? asStringArray(obj.advantagesJa)
        : asStringArray(obj.advantages),
      disadvantagesJa: asStringArray(obj.disadvantagesJa).length
        ? asStringArray(obj.disadvantagesJa)
        : asStringArray(obj.disadvantages)
    };
  });

  const rec = isRecord(parsed.recommendation) ? parsed.recommendation : {};
  const stepsRaw = Array.isArray(rec.reasoningSteps) ? rec.reasoningSteps : [];
  const reasoningSteps = stepsRaw
    .filter(isRecord)
    .map((row) => ({
      stepJa:
        typeof row.stepJa === "string" ? row.stepJa : typeof row.step === "string" ? row.step : "ステップ",
      explanationJa:
        typeof row.explanationJa === "string"
          ? row.explanationJa
          : typeof row.explanation === "string"
            ? row.explanation
            : "",
      citations: (Array.isArray(row.citations) ? row.citations : [])
        .map((c) => parseCitation(c))
        .filter((c): c is JgaapCitation => c != null)
    }));

  const jeRaw = Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [];
  const journalEntries = jeRaw.filter(isRecord).map((obj) => ({
    descriptionJa:
      typeof obj.descriptionJa === "string"
        ? obj.descriptionJa
        : typeof obj.description === "string"
          ? obj.description
          : "",
    debitJa:
      typeof obj.debitJa === "string" ? obj.debitJa : typeof obj.debit === "string" ? obj.debit : "",
    creditJa:
      typeof obj.creditJa === "string"
        ? obj.creditJa
        : typeof obj.credit === "string"
          ? obj.credit
          : "",
    amountExampleJa:
      typeof obj.amountExampleJa === "string"
        ? obj.amountExampleJa
        : typeof obj.amountExample === "string"
          ? obj.amountExample
          : undefined
  }));

  return {
    issueJa:
      typeof parsed.issueJa === "string"
        ? parsed.issueJa
        : typeof parsed.issue === "string"
          ? parsed.issue
          : "",
    judgmentCriteriaJa: asStringArray(parsed.judgmentCriteriaJa).length
      ? asStringArray(parsed.judgmentCriteriaJa)
      : asStringArray(parsed.judgmentCriteria),
    confirmedFactsJa: asStringArray(parsed.confirmedFactsJa).length
      ? asStringArray(parsed.confirmedFactsJa)
      : asStringArray(parsed.confirmedFacts),
    options,
    recommendation: {
      optionId: typeof rec.optionId === "string" ? rec.optionId : undefined,
      titleJa:
        typeof rec.titleJa === "string"
          ? rec.titleJa
          : typeof rec.title === "string"
            ? rec.title
            : undefined,
      rationaleJa:
        typeof rec.rationaleJa === "string"
          ? rec.rationaleJa
          : typeof rec.rationale === "string"
            ? rec.rationale
            : "",
      assumptionsJa: asStringArray(rec.assumptionsJa).length
        ? asStringArray(rec.assumptionsJa)
        : asStringArray(rec.assumptions),
      reasoningSteps
    },
    journalEntries,
    references: asStringArray(parsed.references),
    uncertaintiesJa: asStringArray(parsed.uncertaintiesJa).length
      ? asStringArray(parsed.uncertaintiesJa)
      : asStringArray(parsed.uncertainties)
  };
}

export function parseJgaapDraftAnswerStructured(
  stored: string | null | undefined
): JgaapDraftAnswerStructured | null {
  if (!stored?.trim()) return null;
  if (!stored.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(extractJsonObject(stored)) as Record<string, unknown>;
    return normalizeStructured(parsed);
  } catch {
    return null;
  }
}

export function prettyPrintDraftAnswerJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(extractJsonObject(raw)), null, 2);
  } catch {
    return raw;
  }
}

export type ParagraphIndexEntry = {
  quoteJa: string;
  kind: JgaapParagraphKind;
};

export function citationKey(standardId: string, paragraphId: string): string {
  return `${standardId}::${paragraphId}`;
}

function isNormativeKind(kind: JgaapParagraphKind): boolean {
  return !NON_NORMATIVE_PARAGRAPH_KINDS.includes(kind);
}

export function enrichDraftAnswerFromParagraphIndex(
  draft: JgaapDraftAnswerStructured,
  index: Map<string, ParagraphIndexEntry>
): JgaapDraftAnswerStructured {
  const enrichCitation = (c: JgaapCitation): JgaapCitation | null => {
    const entry = index.get(citationKey(c.standardId, c.paragraphId));
    if (!entry) return c;
    return {
      standardId: c.standardId,
      paragraphId: c.paragraphId,
      kind: entry.kind,
      quoteJa: entry.quoteJa
    };
  };

  return {
    ...draft,
    recommendation: {
      ...draft.recommendation,
      reasoningSteps: draft.recommendation.reasoningSteps.map((step) => ({
        ...step,
        citations: step.citations
          .map((c) => enrichCitation(c))
          .filter((c): c is JgaapCitation => c != null && isNormativeKind(c.kind))
      }))
    }
  };
}

export function draftAnswerToPlainText(d: JgaapDraftAnswerStructured): string {
  const lines: string[] = [
    `論点: ${d.issueJa}`,
    "",
    "判断基準:",
    ...d.judgmentCriteriaJa.map((x) => `- ${x}`),
    "",
    "確認済み事実:",
    ...d.confirmedFactsJa.map((x) => `- ${x}`),
    "",
    `推奨される回答: ${d.recommendation.titleJa ? `${d.recommendation.titleJa} — ` : ""}${d.recommendation.rationaleJa}`
  ];
  return lines.join("\n");
}
