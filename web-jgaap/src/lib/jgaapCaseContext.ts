import type { ParagraphIndexEntry } from "@/lib/jgaapDraftAnswerFormat";
import { prisma } from "@/lib/prisma";
import { NON_NORMATIVE_PARAGRAPH_KINDS, type JgaapParagraphKind } from "@/lib/types";

export async function loadJgaapCaseForAi(caseId: string) {
  return prisma.jgaapCase.findUnique({
    where: { id: caseId },
    include: {
      standardLinks: true,
      searchResults: { orderBy: { createdAt: "desc" } },
      standards: {
        include: {
          standard: {
            select: {
              id: true,
              standardId: true,
              titleJa: true,
              documentKind: true,
              paragraphs: {
                orderBy: { orderIndex: "asc" },
                select: {
                  paragraphId: true,
                  quoteJa: true,
                  kind: true,
                  obligationLevel: true,
                  sectionPathJa: true
                }
              }
            }
          }
        }
      },
      conversationTurns: { orderBy: { createdAt: "asc" } }
    }
  });
}

export async function loadJgaapCaseForDetail(caseId: string) {
  return prisma.jgaapCase.findUnique({
    where: { id: caseId },
    include: {
      standardLinks: true,
      searchResults: { orderBy: { createdAt: "desc" } },
      standards: {
        include: {
          standard: {
            include: {
              paragraphs: {
                select: {
                  paragraphId: true,
                  quoteJa: true,
                  kind: true,
                  obligationLevel: true,
                  sectionPathJa: true
                }
              }
            }
          }
        }
      },
      conversationTurns: { orderBy: { createdAt: "asc" } },
      draftAnswers: { orderBy: { createdAt: "desc" }, take: 1 },
      feedbacks: { orderBy: { createdAt: "desc" }, take: 3 }
    }
  });
}

type CaseWithStandards = NonNullable<Awaited<ReturnType<typeof loadJgaapCaseForAi>>>;

const NON_NORMATIVE_KIND_SET = new Set<string>(NON_NORMATIVE_PARAGRAPH_KINDS);

export function isParagraphKindForAiContext(kind: string): boolean {
  return !NON_NORMATIVE_KIND_SET.has(kind);
}

const BACKGROUND_EXCERPT_MAX = 280;

function excerptForSummary(text: string, max = BACKGROUND_EXCERPT_MAX): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}…`;
}

function formatParagraphs(
  paragraphs: {
    paragraphId: string;
    quoteJa: string;
    kind: string;
    sectionPathJa: string;
  }[]
): string {
  let lastPath = "";
  const lines: string[] = [];
  for (const p of paragraphs) {
    if (p.sectionPathJa && p.sectionPathJa !== lastPath) {
      lines.push(`\n[見出し] ${p.sectionPathJa}`);
      lastPath = p.sectionPathJa;
    }
    lines.push(`第${p.paragraphId}項 (${p.kind}): ${p.quoteJa}`);
  }
  return lines.join("\n");
}

export function buildStandardsPromptBlock(caseStandards: CaseWithStandards["standards"]): string {
  if (caseStandards.length === 0) return "";

  return caseStandards
    .map(({ standard }) => {
      const forAi = standard.paragraphs.filter((p) => isParagraphKindForAiContext(p.kind));
      const backgroundCount = standard.paragraphs.filter((p) => p.kind === "BACKGROUND").length;
      const exampleCount = standard.paragraphs.filter((p) => p.kind === "EXAMPLE").length;
      const header = `=== ${standard.standardId}: ${standard.titleJa} ===`;
      const notes: string[] = [];
      if (backgroundCount > 0) {
        notes.push(`結論の背景 ${backgroundCount} 項は規範引用不可。参考要約用ブロックを別途渡す。`);
      }
      if (exampleCount > 0) {
        notes.push(`設例 ${exampleCount} 項は対象外のため省略。`);
      }
      const note = notes.length ? `（注: ${notes.join(" ")}）\n` : "";
      if (forAi.length === 0) {
        return `${header}\n${note}（回答用に渡す本文・適用指針がありません）`;
      }
      return `${header}\n${note}\n${formatParagraphs(forAi)}`;
    })
    .join("\n\n---\n\n");
}

/** 結論の背景のみ。設例は含めない。規範 citations には使わない。 */
export function buildBackgroundReferencePromptBlock(
  caseStandards: CaseWithStandards["standards"]
): string {
  const blocks = caseStandards
    .map(({ standard }) => {
      const background = standard.paragraphs.filter((p) => p.kind === "BACKGROUND");
      if (background.length === 0) return "";
      const header = `=== ${standard.standardId}: ${standard.titleJa}（結論の背景・参考要約用）===`;
      const lines = background.map(
        (p) => `${standard.standardId} 第${p.paragraphId}項: ${excerptForSummary(p.quoteJa)}`
      );
      return `${header}\n${lines.join("\n")}`;
    })
    .filter(Boolean);

  return blocks.join("\n\n---\n\n");
}

export type JgaapAiPayload = {
  caseTitle: string;
  topicLabel: string | null;
  transactionSummaryJa: string;
  initialQuestionJa: string;
  standardLinks: string[];
  standardsPrompt: string;
  /** 結論の背景（参考要約用）。設例は含まない。 */
  backgroundPrompt: string;
  searchSummaries: string[];
  previousConversation: { role: "user" | "assistant"; content: string }[];
  pastFeedbackBlock?: string;
};

export function buildParagraphIndex(
  caseStandards: CaseWithStandards["standards"]
): Map<string, ParagraphIndexEntry> {
  const index = new Map<string, ParagraphIndexEntry>();
  for (const { standard } of caseStandards) {
    for (const p of standard.paragraphs) {
      index.set(`${standard.standardId}::${p.paragraphId}`, {
        quoteJa: p.quoteJa,
        kind: p.kind as JgaapParagraphKind
      });
    }
  }
  return index;
}

export function buildAiPayloadFromCase(c: CaseWithStandards, extraUserMessage?: string): JgaapAiPayload {
  const previousConversation = [
    ...c.conversationTurns.map((t) => ({
      role: (t.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: t.contentJa
    })),
    ...(extraUserMessage ? [{ role: "user" as const, content: extraUserMessage }] : [])
  ];

  return {
    caseTitle: c.title,
    topicLabel: c.topicLabel ?? null,
    transactionSummaryJa: c.transactionSummaryJa,
    initialQuestionJa: c.initialQuestionJa,
    standardLinks: c.standardLinks.map((l) => l.url),
    standardsPrompt: buildStandardsPromptBlock(c.standards),
    backgroundPrompt: buildBackgroundReferencePromptBlock(c.standards),
    searchSummaries: c.searchResults.map(
      (r) => `${r.title}\n${r.snippet}\n${r.url}`
    ),
    previousConversation
  };
}
