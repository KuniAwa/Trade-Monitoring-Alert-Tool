import { prisma } from "@/lib/prisma";
import { callAi, generateStructuredDraftAnswer, refineDraftWithFeedback } from "@/lib/aiClient";
import {
  buildAiPayloadFromCase,
  buildParagraphIndex,
  loadJgaapCaseForAi,
  loadJgaapCaseForDetail
} from "@/lib/jgaapCaseContext";
import { parseJgaapDraftAnswerStructured, prettyPrintDraftAnswerJson } from "@/lib/jgaapDraftAnswerFormat";
import { searchPerplexity } from "@/lib/perplexity";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { CaseJudgmentWorksheetClient } from "@/components/CaseJudgmentWorksheetClient";
import type { CaseWorksheetData } from "@/components/CaseJudgmentWorksheetClient";
import { buildParagraphValidationIndex, runDraftAnswerValidation } from "@/lib/jgaapCitationValidation";
import type { JgaapFeedbackRating } from "@/lib/types";

interface CaseDetailPageProps {
  params: { id: string };
}

async function buildPastFeedbackBlock(caseId: string, topicLabel: string | null): Promise<string> {
  const label = (topicLabel ?? "").trim();
  if (!label) return "";

  const sameTopicCases = await prisma.jgaapCase.findMany({
    where: {
      id: { not: caseId },
      topicLabel: label,
      feedbacks: { some: {} }
    },
    include: { feedbacks: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  if (!sameTopicCases.length) return "";

  return sameTopicCases
    .map((other) => {
      const fb = other.feedbacks[0];
      const rating = fb?.rating ?? "—";
      return `- ケース「${other.title}」: 評価=${rating}${fb?.commentJa ? `、コメント=${fb.commentJa}` : ""}`;
    })
    .join("\n");
}

async function runPerplexitySearch(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const query = String(formData.get("query") ?? "").trim();
  if (!caseId || !query) throw new Error("検索に必要な情報が不足しています。");

  const results = await searchPerplexity(query);
  await prisma.jgaapSearchResult.createMany({
    data: results.map((r) => ({
      caseId,
      query,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      source: r.source,
      rawJson: null
    }))
  });
  revalidatePath(`/cases/${caseId}`);
}

async function submitConversation(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const contentJa = String(formData.get("contentJa") ?? "").trim();
  if (!caseId || !contentJa) throw new Error("返信内容を入力してください。");

  const c = await loadJgaapCaseForAi(caseId);
  if (!c) throw new Error("ケースが見つかりません。");

  await prisma.jgaapConversationTurn.create({
    data: { caseId, role: "USER", mode: "FOLLOWUP_QUESTION", contentJa }
  });

  const aiMessage = await callAi({
    mode: "FOLLOWUP",
    payload: buildAiPayloadFromCase(c, contentJa)
  });

  await prisma.jgaapConversationTurn.create({
    data: { caseId, role: "ASSISTANT", mode: "FOLLOWUP_QUESTION", contentJa: aiMessage }
  });

  revalidatePath(`/cases/${caseId}`);
}

async function generateDraftAnswer(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) throw new Error("ケース ID が必要です。");

  const c = await loadJgaapCaseForAi(caseId);
  if (!c) throw new Error("ケースが見つかりません。");

  const payload = buildAiPayloadFromCase(c);
  payload.pastFeedbackBlock = await buildPastFeedbackBlock(caseId, c.topicLabel);

  const paragraphIndex = buildParagraphIndex(c.standards);
  const { structuredJson, summaryJa } = await generateStructuredDraftAnswer(payload, paragraphIndex);

  await prisma.jgaapDraftAnswer.create({
    data: { caseId, kind: "JUDGMENT", structuredAnswerJson: structuredJson, summaryJa }
  });

  revalidatePath(`/cases/${caseId}`);
}

async function refineDraftAnswer(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) throw new Error("ケース ID が必要です。");

  const c = await loadJgaapCaseForAi(caseId);
  if (!c) throw new Error("ケースが見つかりません。");

  const latestDraft = await prisma.jgaapDraftAnswer.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" }
  });
  const latestFeedback = await prisma.jgaapFeedback.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" }
  });

  if (!latestDraft) throw new Error("改訂する回答案がありません。");
  if (!latestFeedback) throw new Error("改訂前にフィードバックを保存してください。");

  const previousDraft = parseJgaapDraftAnswerStructured(latestDraft.structuredAnswerJson);
  if (!previousDraft) throw new Error("最新の回答案が JSON 形式ではありません。");

  const payload = buildAiPayloadFromCase(c);
  const paragraphIndex = buildParagraphIndex(c.standards);
  const { structuredJson, summaryJa } = await refineDraftWithFeedback(
    {
      payload,
      previousDraft,
      feedbackRating: latestFeedback.rating as JgaapFeedbackRating,
      feedbackCommentJa: latestFeedback.commentJa
    },
    paragraphIndex
  );

  await prisma.jgaapDraftAnswer.create({
    data: { caseId, kind: "JUDGMENT", structuredAnswerJson: structuredJson, summaryJa }
  });

  await prisma.jgaapConversationTurn.create({
    data: {
      caseId,
      role: "ASSISTANT",
      mode: "FEEDBACK_REFINEMENT",
      contentJa: "フィードバックを反映して回答案を改訂しました。"
    }
  });

  revalidatePath(`/cases/${caseId}`);
}

async function saveFeedback(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  const rating = String(formData.get("rating") ?? "");
  const commentJa = String(formData.get("commentJa") ?? "").trim() || null;
  if (!caseId || !rating) throw new Error("評価を選択してください。");

  const latestDraft = await prisma.jgaapDraftAnswer.findFirst({
    where: { caseId },
    orderBy: { createdAt: "desc" }
  });

  await prisma.jgaapFeedback.create({
    data: {
      caseId,
      draftId: latestDraft?.id,
      rating: rating as JgaapFeedbackRating,
      commentJa
    }
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/history");
}

async function deleteCase(formData: FormData) {
  "use server";

  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) throw new Error("ケース ID が必要です。");

  await prisma.jgaapCase.delete({ where: { id: caseId } });
  revalidatePath("/");
  revalidatePath("/history");
  redirect("/");
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const c = await loadJgaapCaseForDetail(params.id);
  if (!c) notFound();

  const latestDraft = c.draftAnswers[0];
  const parsedDraft = latestDraft
    ? parseJgaapDraftAnswerStructured(latestDraft.structuredAnswerJson)
    : null;
  const latestFeedback = c.feedbacks[0];

  const validationIndex = buildParagraphValidationIndex(c.standards);
  const validationReport = parsedDraft
    ? runDraftAnswerValidation(parsedDraft, validationIndex)
    : null;

  const worksheetData: CaseWorksheetData = {
    id: c.id,
    title: c.title,
    topicLabel: c.topicLabel,
    transactionSummaryJa: c.transactionSummaryJa,
    initialQuestionJa: c.initialQuestionJa,
    notesJa: c.notesJa,
    standardLinks: c.standardLinks.map((l) => ({ id: l.id, label: l.label, url: l.url })),
    standards: c.standards.map((x) => ({
      standardId: x.standardId,
      standardDbId: x.standard.id,
      standardIdLabel: x.standard.standardId,
      titleJa: x.standard.titleJa
    })),
    conversationTurns: c.conversationTurns.map((t) => ({
      id: t.id,
      role: t.role,
      contentJa: t.contentJa
    })),
    searchResults: c.searchResults.map((r) => ({
      id: r.id,
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      source: r.source
    })),
    hasDraft: Boolean(latestDraft),
    parsedDraft,
    draftJsonFallback: latestDraft ? prettyPrintDraftAnswerJson(latestDraft.structuredAnswerJson) : null,
    latestFeedback: latestFeedback
      ? { rating: latestFeedback.rating, commentJa: latestFeedback.commentJa }
      : null,
    feedbackCount: c.feedbacks.length,
    validationReport,
    citationValidations: validationReport?.byAnchor,
    canRefine: Boolean(latestDraft && latestFeedback && parsedDraft)
  };

  return (
    <CaseJudgmentWorksheetClient
      data={worksheetData}
      deleteCaseAction={deleteCase}
      submitConversationAction={submitConversation}
      generateDraftAction={generateDraftAnswer}
      saveFeedbackAction={saveFeedback}
      refineDraftAction={refineDraftAnswer}
      runPerplexityAction={runPerplexitySearch}
    />
  );
}
