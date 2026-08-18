import { citationKey } from "@/lib/jgaapDraftAnswerFormat";
import { checkObligationConsistency } from "@/lib/jgaapObligationCheck";
import type {
  JgaapCitation,
  JgaapDraftAnswerStructured,
  JgaapObligationLevel,
  JgaapParagraphKind
} from "@/lib/types";
import { JGAAP_PARAGRAPH_KIND_LABELS, NON_NORMATIVE_PARAGRAPH_KINDS } from "@/lib/types";

export type ValidationLevel = "ERROR" | "WARN" | "INFO";

export type CitationValidationStatus =
  | "verified"
  | "verified_subclause"
  | "mismatch"
  | "not_found"
  | "non_normative"
  | "kind_mismatch";

export type ParagraphValidationEntry = {
  quoteJa: string;
  kind: JgaapParagraphKind;
  obligationLevel: JgaapObligationLevel;
};

export type CitationValidationResult = {
  anchorId: string;
  standardId: string;
  paragraphId: string;
  status: CitationValidationStatus;
  level: ValidationLevel;
  messageJa: string;
  location: string;
  expectedKind?: JgaapParagraphKind;
  actualKind?: JgaapParagraphKind;
  dbKind?: JgaapParagraphKind;
};

export type ValidationIssue = CitationValidationResult & {
  category: "citation" | "obligation" | "non_normative";
};

export type ValidationReportSummary = {
  verified: number;
  mismatch: number;
  notFound: number;
  nonNormative: number;
  obligationIssues: number;
  kindMismatch: number;
  totalCitations: number;
};

export type ValidationReport = {
  summary: ValidationReportSummary;
  issues: ValidationIssue[];
  byAnchor: Record<string, CitationValidationResult>;
};

type CaseStandardsInput = {
  standard: {
    standardId: string;
    paragraphs: {
      paragraphId: string;
      quoteJa: string;
      kind: string;
      obligationLevel: string;
    }[];
  };
}[];

export function normalizeQuoteText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildParagraphValidationIndex(
  caseStandards: CaseStandardsInput
): Map<string, ParagraphValidationEntry> {
  const index = new Map<string, ParagraphValidationEntry>();
  for (const { standard } of caseStandards) {
    for (const p of standard.paragraphs) {
      index.set(citationKey(standard.standardId, p.paragraphId), {
        quoteJa: p.quoteJa,
        kind: p.kind as JgaapParagraphKind,
        obligationLevel: p.obligationLevel as JgaapObligationLevel
      });
    }
  }
  return index;
}

function isNonNormativeKind(kind: JgaapParagraphKind): boolean {
  return NON_NORMATIVE_PARAGRAPH_KINDS.includes(kind);
}

function findSubclauseMatch(citationQuote: string, entryQuote: string): boolean {
  const c = normalizeQuoteText(citationQuote);
  const e = normalizeQuoteText(entryQuote);
  if (!c || c.length < 20) return false;
  if (e.includes(c)) return true;
  if (c.includes(e) && e.length >= 20) return true;
  return false;
}

function validateCitation(
  citation: JgaapCitation,
  index: Map<string, ParagraphValidationEntry>,
  opts: { location: string; anchorId: string; normativeContext: boolean }
): { result: CitationValidationResult; obligationIssue?: ValidationIssue } {
  const key = citationKey(citation.standardId, citation.paragraphId);
  const entry = index.get(key);

  if (!entry) {
    return {
      result: {
        anchorId: opts.anchorId,
        standardId: citation.standardId,
        paragraphId: citation.paragraphId,
        status: "not_found",
        level: "ERROR",
        messageJa: "リンク済み日本基準に項が見つかりません。",
        location: opts.location,
        actualKind: citation.kind
      }
    };
  }

  const dbKind = entry.kind;

  if (opts.normativeContext && isNonNormativeKind(dbKind)) {
    return {
      result: {
        anchorId: opts.anchorId,
        standardId: citation.standardId,
        paragraphId: citation.paragraphId,
        status: "non_normative",
        level: "ERROR",
        messageJa: `規範引用として ${JGAAP_PARAGRAPH_KIND_LABELS[dbKind]} は使用できません。`,
        location: opts.location,
        expectedKind: citation.kind,
        actualKind: citation.kind,
        dbKind
      }
    };
  }

  const quoteMatchesFull = normalizeQuoteText(citation.quoteJa) === normalizeQuoteText(entry.quoteJa);
  const subclause = quoteMatchesFull ? false : findSubclauseMatch(citation.quoteJa, entry.quoteJa);

  if (!quoteMatchesFull && !subclause) {
    return {
      result: {
        anchorId: opts.anchorId,
        standardId: citation.standardId,
        paragraphId: citation.paragraphId,
        status: "mismatch",
        level: "ERROR",
        messageJa: "quoteJa が DB の条文（項／項内抜粋）と一致しません。",
        location: opts.location,
        dbKind
      }
    };
  }

  if (citation.kind !== dbKind) {
    return {
      result: {
        anchorId: opts.anchorId,
        standardId: citation.standardId,
        paragraphId: citation.paragraphId,
        status: "kind_mismatch",
        level: "WARN",
        messageJa: `引用 kind（${citation.kind}）が DB（${dbKind}）と異なります。`,
        location: opts.location,
        expectedKind: dbKind,
        actualKind: citation.kind,
        dbKind
      }
    };
  }

  const obligation = checkObligationConsistency(entry.quoteJa, entry.obligationLevel);
  const result: CitationValidationResult = {
    anchorId: opts.anchorId,
    standardId: citation.standardId,
    paragraphId: citation.paragraphId,
    status: subclause ? "verified_subclause" : "verified",
    level: "INFO",
    messageJa: subclause
      ? "引用は同一項内の抜粋と一致しています。"
      : "引用は DB の日本基準の項と一致しています。",
    location: opts.location,
    dbKind
  };

  if (!obligation.consistent) {
    return {
      result,
      obligationIssue: {
        ...result,
        category: "obligation",
        level: obligation.level,
        messageJa: obligation.messageJa,
        status: "verified"
      }
    };
  }

  return { result };
}

function finalizeReport(
  results: CitationValidationResult[],
  obligationIssues: ValidationIssue[]
): ValidationReport {
  const citationIssues: ValidationIssue[] = results
    .filter((r) => r.status !== "verified" && r.status !== "verified_subclause")
    .map((r) => ({
      ...r,
      category: (r.status === "non_normative" ? "non_normative" : "citation") as ValidationIssue["category"]
    }));

  const issues = [...citationIssues, ...obligationIssues];

  const summary: ValidationReportSummary = {
    verified: results.filter((r) => r.status === "verified" || r.status === "verified_subclause").length,
    mismatch: results.filter((r) => r.status === "mismatch").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    nonNormative: results.filter((r) => r.status === "non_normative").length,
    kindMismatch: results.filter((r) => r.status === "kind_mismatch").length,
    obligationIssues: obligationIssues.length,
    totalCitations: results.length
  };

  const byAnchor: Record<string, CitationValidationResult> = {};
  for (const r of results) {
    byAnchor[r.anchorId] = r;
  }

  return { summary, issues, byAnchor };
}

export function runDraftAnswerValidation(
  draft: JgaapDraftAnswerStructured,
  index: Map<string, ParagraphValidationEntry>
): ValidationReport {
  const results: CitationValidationResult[] = [];
  const obligationIssues: ValidationIssue[] = [];

  draft.recommendation.reasoningSteps.forEach((step, stepIdx) => {
    step.citations.forEach((citation, citIdx) => {
      const anchorId = `draft-rs-${stepIdx}-c-${citIdx}`;
      const location = `recommendation.reasoningSteps[${stepIdx}].citations[${citIdx}]`;
      const { result, obligationIssue } = validateCitation(citation, index, {
        location,
        anchorId,
        normativeContext: true
      });
      results.push(result);
      if (obligationIssue) obligationIssues.push(obligationIssue);
    });
  });

  return finalizeReport(results, obligationIssues);
}

export function countParagraphObligationIssues(
  paragraphs: {
    paragraphId: string;
    quoteJa: string;
    obligationLevel: string;
    reviewStatus?: string;
  }[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  paragraphs.forEach((p, idx) => {
    if (p.reviewStatus === "HUMAN_REVIEWED") return;
    const check = checkObligationConsistency(
      p.quoteJa,
      p.obligationLevel as JgaapObligationLevel
    );
    if (check.consistent) return;
    issues.push({
      anchorId: `paragraph-${idx}`,
      standardId: "",
      paragraphId: p.paragraphId,
      status: "verified",
      level: check.level,
      messageJa: check.messageJa,
      location: `第${p.paragraphId}項`,
      category: "obligation"
    });
  });
  return issues;
}
