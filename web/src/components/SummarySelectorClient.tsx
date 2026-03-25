"use client";

import { useCallback, useMemo, useState } from "react";

type SummaryItem = {
  id: string;
  title: string;
  topicLabel: string | null;
  framework: string;
  updatedAt: Date | string;
};

type SortKey = "updatedDesc" | "updatedAsc" | "title" | "topicLabel";

function sortSummaries(items: SummaryItem[], sortKey: SortKey): SummaryItem[] {
  const arr = [...items];
  switch (sortKey) {
    case "updatedDesc":
      return arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case "updatedAsc":
      return arr.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    case "title":
      return arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", "ja"));
    case "topicLabel":
      return arr.sort((a, b) => (a.topicLabel || "").localeCompare(b.topicLabel || "", "ja"));
    default:
      return arr;
  }
}

export function SummarySelectorClient({ summaries }: { summaries: SummaryItem[] }) {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedDesc");

  const filteredAndSorted = useMemo(() => {
    let list = summaries;
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.topicLabel ?? "").toLowerCase().includes(q) ||
          (s.framework ?? "").toLowerCase().includes(q)
      );
    }
    return sortSummaries(list, sortKey);
  }, [summaries, filter, sortKey]);

  const applySelected = useCallback(async () => {
    const checkboxes = document.querySelectorAll<HTMLInputElement>(
      "input[name='summaryLibraryCheck']:checked"
    );
    const ids = Array.from(checkboxes).map((el) => el.value).filter(Boolean);
    const hiddenEl = document.getElementById("selectedLibrarySummaryIds") as HTMLInputElement;
    if (hiddenEl) hiddenEl.value = ids.join(",");

    if (ids.length === 0) {
      const contentEl = document.getElementById("notebookSummary") as HTMLTextAreaElement;
      const linksEl = document.getElementById("standardLinks") as HTMLTextAreaElement;
      const titleEl = document.querySelector<HTMLInputElement>("input[name='title']");
      const topicEl = document.querySelector<HTMLInputElement>("input[name='topicLabel']");
      const standardEl = document.querySelector<HTMLSelectElement>("select[name='standard']");
      if (contentEl) contentEl.value = "";
      if (linksEl) linksEl.value = "";
      if (titleEl) titleEl.value = "";
      if (topicEl) topicEl.value = "";
      if (standardEl) standardEl.value = "JGAAP";
      return;
    }

    setLoading(true);
    try {
      const contents: string[] = [];
      const sourceLinksList: string[] = [];
      let firstTitle = "";
      let firstTopicLabel: string | null = null;
      let firstFramework = "JGAAP";

      for (const id of ids) {
        const res = await fetch(`/api/summaries/${id}`);
        if (!res.ok) continue;
        const data = (await res.json()) as {
          content: string;
          sourceLinks: string;
          title?: string;
          topicLabel?: string | null;
          framework?: string;
        };
        contents.push(data.content ?? "");
        if (data.sourceLinks?.trim()) sourceLinksList.push(data.sourceLinks.trim());
        if (!firstTitle && data.title) firstTitle = data.title;
        if (firstTopicLabel == null && data.topicLabel != null) firstTopicLabel = data.topicLabel;
        if (firstFramework === "JGAAP" && data.framework) firstFramework = data.framework;
      }

      const contentEl = document.getElementById("notebookSummary") as HTMLTextAreaElement;
      const linksEl = document.getElementById("standardLinks") as HTMLTextAreaElement;
      const titleEl = document.querySelector<HTMLInputElement>("input[name='title']");
      const topicEl = document.querySelector<HTMLInputElement>("input[name='topicLabel']");
      const standardEl = document.querySelector<HTMLSelectElement>("select[name='standard']");

      if (contentEl) contentEl.value = contents.join("\n\n---\n\n");
      if (linksEl) linksEl.value = [...new Set(sourceLinksList)].join("\n");
      if (titleEl) titleEl.value = firstTitle || (ids.length > 1 ? "複数要約の統合" : "");
      if (topicEl) topicEl.value = firstTopicLabel ?? "";
      if (standardEl) standardEl.value = firstFramework;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAllVisible = useCallback(() => {
    filteredAndSorted.forEach((s) => {
      const el = document.querySelector<HTMLInputElement>(`input[name='summaryLibraryCheck'][value='${s.id}']`);
      if (el) el.checked = true;
    });
  }, [filteredAndSorted]);

  const clearSelection = useCallback(() => {
    document.querySelectorAll<HTMLInputElement>("input[name='summaryLibraryCheck']").forEach((el) => {
      el.checked = false;
    });
    const hiddenEl = document.getElementById("selectedLibrarySummaryIds") as HTMLInputElement;
    if (hiddenEl) hiddenEl.value = "";
  }, []);

  return (
    <div className="mb-2">
      <label className="section-title block mb-1">保存済み要約から選択（複数可）</label>

      <div className="flex flex-wrap items-center gap-2 mb-1">
        <input
          type="search"
          placeholder="タイトル・論点・基準で検索…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input text-sm flex-1 min-w-[180px] max-w-xs"
          aria-label="要約を検索"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="input text-sm w-auto"
          aria-label="並び替え"
        >
          <option value="updatedDesc">更新日 新しい順</option>
          <option value="updatedAsc">更新日 古い順</option>
          <option value="title">タイトル順</option>
          <option value="topicLabel">論点ラベル順</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 mb-1 text-xs text-slate-600">
        <span>
          全{summaries.length}件
          {filter.trim() && ` → ${filteredAndSorted.length}件表示`}
        </span>
        {filteredAndSorted.length > 0 && (
          <span className="flex gap-2">
            <button type="button" onClick={selectAllVisible} className="text-sky-600 hover:underline">
              表示中のすべて選択
            </button>
            <button type="button" onClick={clearSelection} className="text-slate-500 hover:underline">
              選択解除
            </button>
          </span>
        )}
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-2 max-h-64 overflow-y-auto space-y-1">
        {summaries.length === 0 ? (
          <p className="text-xs text-slate-500">保存済み要約がありません。</p>
        ) : filteredAndSorted.length === 0 ? (
          <p className="text-xs text-slate-500">条件に一致する要約がありません。</p>
        ) : (
          filteredAndSorted.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-100 rounded px-1 -mx-1 py-0.5">
              <input
                type="checkbox"
                name="summaryLibraryCheck"
                value={s.id}
                className="rounded border-slate-300"
              />
              <span className="flex-1 min-w-0 truncate" title={`${s.title}${s.topicLabel ? ` #${s.topicLabel}` : ""} ${s.framework}`}>
                {s.title}
                {s.topicLabel ? <span className="text-slate-500"> (#{s.topicLabel})</span> : ""}
                <span className="text-slate-400"> — {s.framework}</span>
              </span>
            </label>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={applySelected}
        disabled={loading}
        className="secondary-button text-sm mt-1"
      >
        {loading ? "反映中…" : "選択した要約をフォームに反映"}
      </button>
      <p className="section-help mt-0.5">
        検索・並び替えで絞り込んでから選択できます。複数選択して「反映」すると、要約内容・会計基準リンクを結合してフォームに反映します。
      </p>
    </div>
  );
}
