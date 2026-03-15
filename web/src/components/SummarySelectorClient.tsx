"use client";

import { useCallback } from "react";

type SummaryItem = {
  id: string;
  title: string;
  topicLabel: string | null;
  framework: string;
  updatedAt: Date | string;
};

export function SummarySelectorClient({ summaries }: { summaries: SummaryItem[] }) {
  const onSelect = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = e.target.value;
      if (!id) {
        (document.getElementById("selectedLibrarySummaryId") as HTMLInputElement).value = "";
        return;
      }
      const res = await fetch(`/api/summaries/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        content: string;
        sourceLinks: string;
        title?: string;
        topicLabel?: string | null;
        framework?: string;
      };
      const contentEl = document.getElementById("notebookSummary") as HTMLTextAreaElement;
      const linksEl = document.getElementById("standardLinks") as HTMLTextAreaElement;
      const hiddenEl = document.getElementById("selectedLibrarySummaryId") as HTMLInputElement;
      if (contentEl) contentEl.value = data.content ?? "";
      if (linksEl) linksEl.value = data.sourceLinks ?? "";
      if (hiddenEl) hiddenEl.value = id;
      // 任意: ケース名・論点・基準も反映する
      const titleEl = document.querySelector<HTMLInputElement>("input[name='title']");
      const topicEl = document.querySelector<HTMLInputElement>("input[name='topicLabel']");
      const standardEl = document.querySelector<HTMLSelectElement>("select[name='standard']");
      if (data.title && titleEl) titleEl.value = data.title;
      if (data.topicLabel != null && topicEl) topicEl.value = data.topicLabel ?? "";
      if (data.framework && standardEl) standardEl.value = data.framework;
    },
    []
  );

  return (
    <div className="mb-2">
      <label className="section-title block mb-1">保存済み要約から選択</label>
      <select
        className="input text-sm w-full max-w-md"
        onChange={onSelect}
        defaultValue=""
      >
        <option value="">— 選択してください —</option>
        {summaries.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
            {s.topicLabel ? ` (#${s.topicLabel})` : ""} — {s.framework} ·{" "}
            {new Date(s.updatedAt as string).toLocaleDateString("ja-JP")}
          </option>
        ))}
      </select>
      <p className="section-help mt-0.5">
        選択すると要約内容・会計基準リンク・ケース名・論点ラベル・会計基準がフォームに反映されます。ケース作成時はその内容がケースへコピー（スナップショット）されます。
      </p>
    </div>
  );
}
