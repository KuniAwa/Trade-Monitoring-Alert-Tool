import { useMemo, type ReactNode } from "react";

import { CitationValidationBadge } from "@/components/CitationValidationBadge";
import type { CitationValidationResult } from "@/lib/jgaapCitationValidation";
import type { JgaapCitation, JgaapDraftAnswerStructured, JgaapParagraphKind } from "@/lib/types";
import { JGAAP_PARAGRAPH_KIND_LABELS } from "@/lib/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200/90 pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
      <h3 className="text-[13px] font-semibold tracking-tight text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) {
    return <p className="text-[11px] text-slate-500 italic">{emptyLabel}</p>;
  }
  return (
    <ul className="list-disc pl-[1.15rem] space-y-2 text-[12px] text-slate-700 leading-relaxed">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function CitationBlock({
  citation,
  validation,
  anchorId
}: {
  citation: JgaapCitation;
  validation?: CitationValidationResult;
  anchorId: string;
}) {
  const kindLabel = JGAAP_PARAGRAPH_KIND_LABELS[citation.kind as JgaapParagraphKind] ?? citation.kind;
  return (
    <div className="mt-2 space-y-1" id={anchorId}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-blue-200 bg-blue-50 text-blue-900">
          {citation.standardId}
        </span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200 bg-slate-100 text-slate-700">
          第{citation.paragraphId}項
        </span>
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-slate-200 bg-white text-slate-600">
          {kindLabel}
        </span>
        <CitationValidationBadge result={validation} anchorId={anchorId} />
      </div>
      <blockquote className="border-l-2 border-slate-300 pl-3 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed">
        {citation.quoteJa}
      </blockquote>
    </div>
  );
}

function validationForCitationAt(
  stepIdx: number,
  citIdx: number,
  citationValidations?: Record<string, CitationValidationResult>
): CitationValidationResult | undefined {
  return citationValidations?.[`draft-rs-${stepIdx}-c-${citIdx}`];
}

export function DraftAnswerDisplay({
  draft: d,
  citationValidations
}: {
  draft: JgaapDraftAnswerStructured;
  citationValidations?: Record<string, CitationValidationResult>;
}) {
  const steps = useMemo(() => d.recommendation.reasoningSteps, [d]);

  return (
    <article className="space-y-0 text-[12px] text-slate-800">
      <Section title="論点">
        <p className="leading-relaxed whitespace-pre-wrap">{d.issueJa.trim() || "（なし）"}</p>
      </Section>

      <Section title="判断基準">
        <BulletList items={d.judgmentCriteriaJa} emptyLabel="（なし）" />
      </Section>

      <Section title="確認済み事実">
        <BulletList items={d.confirmedFactsJa} emptyLabel="（なし）" />
      </Section>

      <Section title="推奨される回答">
        {d.recommendation.titleJa ? (
          <p className="font-semibold text-slate-900 leading-relaxed">{d.recommendation.titleJa}</p>
        ) : null}
        <p className={`whitespace-pre-wrap leading-relaxed text-slate-700 ${d.recommendation.titleJa ? "mt-2" : ""}`}>
          {d.recommendation.rationaleJa}
        </p>
        {steps.length > 0 ? (
          <ol className="list-decimal pl-[1.25rem] mt-3 space-y-3 text-[12px]">
            {steps.map((st, stepIdx) => (
              <li key={stepIdx} className="leading-relaxed pl-1">
                <span className="font-medium text-slate-900">{st.stepJa}</span>
                <p className="mt-1 whitespace-pre-wrap">{st.explanationJa}</p>
                {st.citations.map((citation, citIdx) => (
                  <CitationBlock
                    key={citIdx}
                    citation={citation}
                    validation={validationForCitationAt(stepIdx, citIdx, citationValidations)}
                    anchorId={`draft-rs-${stepIdx}-c-${citIdx}`}
                  />
                ))}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="mt-3">
          <div className="text-[11px] font-medium text-slate-600 mb-1">前提</div>
          <BulletList items={d.recommendation.assumptionsJa} emptyLabel="（なし）" />
        </div>
      </Section>

      <Section title="仕訳例">
        {!d.journalEntries.length ? (
          <p className="text-[11px] text-slate-500 italic">（なし）</p>
        ) : (
          <ul className="space-y-2 list-none pl-0">
            {d.journalEntries.map((j, i) => (
              <li key={i} className="rounded border border-slate-100 bg-white px-2.5 py-2 text-[11px]">
                <div className="font-medium">{j.descriptionJa || "（説明なし）"}</div>
                <div className="mt-1 text-slate-700">借方: {j.debitJa || "—"}</div>
                <div className="text-slate-700">貸方: {j.creditJa || "—"}</div>
                {j.amountExampleJa ? (
                  <div className="text-slate-600">金額例: {j.amountExampleJa}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="参考">
        <p className="text-[11px] text-slate-500 mb-2">
          結論の背景・Perplexity 検索結果は参考情報（要約）です。規範的根拠ではありません。
        </p>
        <BulletList items={d.references} emptyLabel="（なし）" />
      </Section>

      <Section title="不確実性">
        <BulletList items={d.uncertaintiesJa} emptyLabel="（なし）" />
      </Section>
    </article>
  );
}
