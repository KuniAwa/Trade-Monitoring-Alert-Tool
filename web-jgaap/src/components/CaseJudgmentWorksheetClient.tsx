"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DraftAnswerDisplay } from "@/components/DraftAnswerDisplay";
import { ValidationReportPanel } from "@/components/ValidationReportPanel";
import type { CitationValidationResult, ValidationReport } from "@/lib/jgaapCitationValidation";
import { JGAAP_FEEDBACK_RATING_LABELS, type JgaapDraftAnswerStructured, type JgaapFeedbackRating } from "@/lib/types";

export type SearchResultView = {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
};

export type CaseWorksheetData = {
  id: string;
  title: string;
  topicLabel: string | null;
  transactionSummaryJa: string;
  initialQuestionJa: string;
  notesJa: string;
  standardLinks: { id: string; label: string | null; url: string }[];
  standards: {
    standardId: string;
    standardDbId: string;
    standardIdLabel: string;
    titleJa: string;
  }[];
  conversationTurns: { id: string; role: string; contentJa: string }[];
  searchResults: SearchResultView[];
  hasDraft: boolean;
  parsedDraft: JgaapDraftAnswerStructured | null;
  draftJsonFallback: string | null;
  latestFeedback: { rating: string; commentJa: string | null } | null;
  feedbackCount: number;
  validationReport: ValidationReport | null;
  citationValidations: Record<string, CitationValidationResult> | undefined;
  canRefine: boolean;
};

export function CaseJudgmentWorksheetClient({
  data,
  deleteCaseAction,
  submitConversationAction,
  generateDraftAction,
  saveFeedbackAction,
  refineDraftAction,
  runPerplexityAction
}: {
  data: CaseWorksheetData;
  deleteCaseAction: (formData: FormData) => Promise<void>;
  submitConversationAction: (formData: FormData) => Promise<void>;
  generateDraftAction: (formData: FormData) => Promise<void>;
  saveFeedbackAction: (formData: FormData) => Promise<void>;
  refineDraftAction: (formData: FormData) => Promise<void>;
  runPerplexityAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(data.title);
  const [topicLabel, setTopicLabel] = useState(data.topicLabel ?? "");
  const [transactionSummaryJa, setTransactionSummaryJa] = useState(data.transactionSummaryJa);
  const [initialQuestionJa, setInitialQuestionJa] = useState(data.initialQuestionJa);
  const [notesJa, setNotesJa] = useState(data.notesJa);
  const [caseBusy, setCaseBusy] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [caseSaved, setCaseSaved] = useState(false);
  const [replyJa, setReplyJa] = useState("");

  useEffect(() => {
    setReplyJa("");
  }, [data.conversationTurns.length]);

  useEffect(() => {
    setTitle(data.title);
    setTopicLabel(data.topicLabel ?? "");
    setTransactionSummaryJa(data.transactionSummaryJa);
    setInitialQuestionJa(data.initialQuestionJa);
    setNotesJa(data.notesJa);
  }, [data]);

  const saveCaseFields = useCallback(async () => {
    setCaseBusy(true);
    setCaseError(null);
    setCaseSaved(false);
    try {
      const res = await fetch(`/api/cases/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topicLabel: topicLabel || null,
          transactionSummaryJa,
          initialQuestionJa,
          notesJa
        })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "保存に失敗しました。");
      setCaseSaved(true);
      router.refresh();
    } catch (e) {
      setCaseError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setCaseBusy(false);
    }
  }, [data.id, title, topicLabel, transactionSummaryJa, initialQuestionJa, notesJa, router]);

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="page-header">
        <div>
          <h1 className="page-title">{data.title}</h1>
          <p className="page-subtitle">日本基準 判断ケース（ASBJ HTML を正本）</p>
        </div>
        <form action={deleteCaseAction}>
          <input type="hidden" name="caseId" value={data.id} />
          <button type="submit" className="secondary-button text-xs text-red-700">
            ケースを削除
          </button>
        </form>
      </header>

      <section className="card space-y-3">
        <h2 className="section-title">ケース情報</h2>
        {caseError ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{caseError}</div>
        ) : null}
        {caseSaved ? <div className="text-xs text-green-700">保存しました。</div> : null}
        <div>
          <label className="section-title">タイトル</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="section-title">トピック（任意）</label>
          <input
            className="input"
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value)}
            placeholder="収益、リース 等"
          />
        </div>
        <div>
          <label className="section-title">取引概要</label>
          <textarea
            className="textarea"
            rows={4}
            value={transactionSummaryJa}
            onChange={(e) => setTransactionSummaryJa(e.target.value)}
          />
        </div>
        <div>
          <label className="section-title">初期質問</label>
          <textarea
            className="textarea"
            rows={3}
            value={initialQuestionJa}
            onChange={(e) => setInitialQuestionJa(e.target.value)}
          />
        </div>
        <div>
          <label className="section-title">メモ（AI 非送信）</label>
          <textarea className="textarea" rows={2} value={notesJa} onChange={(e) => setNotesJa(e.target.value)} />
        </div>
        <button type="button" className="secondary-button text-xs" disabled={caseBusy} onClick={() => void saveCaseFields()}>
          {caseBusy ? "保存中…" : "ケース情報を保存"}
        </button>
      </section>

      {data.standards.length > 0 ? (
        <section className="card space-y-2">
          <h2 className="section-title">リンク済み基準</h2>
          <ul className="text-sm space-y-1">
            {data.standards.map((s) => (
              <li key={s.standardDbId}>
                <a href={`/standards/${s.standardDbId}`} className="text-brand hover:underline">
                  {s.standardIdLabel}
                </a>
                <span className="text-slate-500"> — {s.titleJa}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Perplexity 検索（補助）</h2>
            <p className="section-help">規範の根拠には使いません。実務解説などの補助情報です。</p>
          </div>
          <form action={runPerplexityAction} className="flex items-center gap-2">
            <input type="hidden" name="caseId" value={data.id} />
            <input name="query" className="input text-xs w-48" defaultValue={data.title} placeholder="検索クエリ" />
            <button className="secondary-button text-xs" type="submit">
              検索を実行
            </button>
          </form>
        </div>
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600 max-h-60 overflow-auto space-y-2">
          {data.searchResults.length === 0 ? (
            <p>まだ検索結果はありません。</p>
          ) : (
            data.searchResults.map((r) => (
              <div key={r.id} className="border-b last:border-b-0 pb-2 last:pb-0">
                <div className="font-semibold">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {r.title}
                  </a>
                </div>
                <div className="text-[11px] text-slate-500 mb-1">{r.source}</div>
                <p className="text-xs whitespace-pre-wrap">{r.snippet}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">対話</h2>
        <div className="space-y-3 text-sm">
          {data.conversationTurns.length === 0 ? (
            <p className="text-slate-500 text-xs">まだ対話がありません。</p>
          ) : (
            data.conversationTurns.map((t) => (
              <div
                key={t.id}
                className={`rounded px-3 py-2 whitespace-pre-wrap ${
                  t.role === "USER" ? "bg-slate-100" : "bg-blue-50/80"
                }`}
              >
                <div className="text-[10px] font-medium text-slate-500 mb-1">
                  {t.role === "USER" ? "ユーザー" : t.role === "ASSISTANT" ? "AI" : "システム"}
                </div>
                {t.contentJa}
              </div>
            ))
          )}
        </div>
        <form action={submitConversationAction} className="space-y-2">
          <input type="hidden" name="caseId" value={data.id} />
          <textarea
            name="contentJa"
            className="textarea"
            rows={3}
            placeholder="追加の事実や質問を日本語で入力"
            value={replyJa}
            onChange={(e) => setReplyJa(e.target.value)}
            required
          />
          <button type="submit" className="primary-button text-xs">
            送信して AI に追加質問を依頼
          </button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">回答案</h2>
        <form action={generateDraftAction}>
          <input type="hidden" name="caseId" value={data.id} />
          <button type="submit" className="primary-button text-xs">
            {data.hasDraft ? "回答案を再生成" : "回答案を生成"}
          </button>
        </form>

        {data.parsedDraft ? (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50/50 p-4">
            <DraftAnswerDisplay draft={data.parsedDraft} citationValidations={data.citationValidations} />
          </div>
        ) : data.draftJsonFallback ? (
          <pre className="text-[11px] overflow-x-auto mt-4 p-3 bg-slate-100 rounded">{data.draftJsonFallback}</pre>
        ) : null}

        {data.validationReport ? <ValidationReportPanel report={data.validationReport} /> : null}
      </section>

      {data.hasDraft ? (
        <section className="card space-y-3">
          <h2 className="section-title">フィードバック</h2>
          <form action={saveFeedbackAction} className="space-y-2">
            <input type="hidden" name="caseId" value={data.id} />
            <div>
              <label className="section-title">評価</label>
              <select name="rating" className="input" defaultValue={data.latestFeedback?.rating ?? "ADEQUATE"}>
                {(Object.keys(JGAAP_FEEDBACK_RATING_LABELS) as JgaapFeedbackRating[]).map((k) => (
                  <option key={k} value={k}>
                    {JGAAP_FEEDBACK_RATING_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title">コメント</label>
              <textarea
                name="commentJa"
                className="textarea"
                rows={3}
                defaultValue={data.latestFeedback?.commentJa ?? ""}
              />
            </div>
            <button type="submit" className="secondary-button text-xs">
              フィードバックを保存
            </button>
          </form>
          {data.canRefine ? (
            <form action={refineDraftAction}>
              <input type="hidden" name="caseId" value={data.id} />
              <button type="submit" className="primary-button text-xs mt-2">
                フィードバックを反映して再生成
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">再生成するにはフィードバックを保存してください。</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
