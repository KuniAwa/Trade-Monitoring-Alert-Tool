"use client";

import { useState } from "react";

import type { ValidationReport } from "@/lib/jgaapCitationValidation";

const LEVEL_CLASS: Record<string, string> = {
  ERROR: "text-red-800 bg-red-50 border-red-200",
  WARN: "text-amber-900 bg-amber-50 border-amber-200",
  INFO: "text-slate-700 bg-slate-50 border-slate-200"
};

export function ValidationReportPanel({ report }: { report: ValidationReport | null }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!report) {
    return (
      <div className="card space-y-2 mt-4">
        <h2 className="section-title">引用検証</h2>
        <p className="section-help text-xs">回答案を生成すると引用検証が表示されます。</p>
      </div>
    );
  }

  const s = report.summary;

  return (
    <div className="card space-y-3 mt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        <h2 className="section-title">引用検証</h2>
        <span className="text-[10px] text-slate-500">{collapsed ? "表示" : "非表示"}</span>
      </button>

      {!collapsed ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
              <div className="text-blue-800 font-medium">一致（項/抜粋）</div>
              <div className="text-lg font-semibold text-blue-900">{s.verified}</div>
            </div>
            <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5">
              <div className="text-red-800 font-medium">不一致 / 未登録</div>
              <div className="text-lg font-semibold text-red-900">{s.mismatch + s.notFound}</div>
            </div>
            <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5">
              <div className="text-red-800 font-medium">非規範引用</div>
              <div className="text-lg font-semibold text-red-900">{s.nonNormative}</div>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
              <div className="text-amber-900 font-medium">区分不一致</div>
              <div className="text-lg font-semibold text-amber-950">{s.kindMismatch}</div>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
              <div className="text-amber-900 font-medium">義務レベル</div>
              <div className="text-lg font-semibold text-amber-950">{s.obligationIssues}</div>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
              <div className="text-slate-600 font-medium">引用総数</div>
              <div className="text-lg font-semibold text-slate-900">{s.totalCitations}</div>
            </div>
          </div>

          {report.issues.length === 0 ? (
            <p className="text-xs text-blue-800">すべての引用が検証を通過しました。</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
              {report.issues.map((issue, i) => (
                <li
                  key={`${issue.anchorId}-${issue.category}-${i}`}
                  className={`rounded border px-2 py-1.5 ${LEVEL_CLASS[issue.level] ?? LEVEL_CLASS.INFO}`}
                >
                  <div className="font-mono text-[10px] opacity-80">
                    [{issue.level}] {issue.standardId} / 第{issue.paragraphId}項
                    {issue.dbKind ? ` · DB: ${issue.dbKind}` : ""}
                  </div>
                  <div>{issue.messageJa}</div>
                  {issue.anchorId ? (
                    <a href={`#${issue.anchorId}`} className="text-[10px] text-brand hover:underline">
                      引用へジャンプ
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
