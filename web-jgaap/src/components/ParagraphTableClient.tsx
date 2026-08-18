"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ModalDialog } from "@/components/ModalDialog";
import { ReviewStatusToggle } from "@/components/ReviewStatusToggle";
import {
  JGAAP_OBLIGATION_LEVEL_LABELS,
  JGAAP_PARAGRAPH_KIND_LABELS,
  type JgaapObligationLevel,
  type JgaapParagraphKind
} from "@/lib/types";

export type ParagraphRow = {
  id: string;
  paragraphId: string;
  kind: string;
  quoteJa: string;
  sectionPathJa: string;
  obligationLevel: string;
  notesJa: string;
  reviewStatus: string;
  editedManually: boolean;
  orderIndex: number;
};

const KIND_OPTIONS = Object.entries(JGAAP_PARAGRAPH_KIND_LABELS) as [JgaapParagraphKind, string][];
const OBLIGATION_OPTIONS = Object.entries(JGAAP_OBLIGATION_LEVEL_LABELS) as [
  JgaapObligationLevel,
  string
][];

type EditState = {
  paragraphId: string;
  kind: string;
  quoteJa: string;
  obligationLevel: string;
  notesJa: string;
};

export function ParagraphTableClient({
  initialParagraphs,
  obligationWarningParagraphIds
}: {
  initialParagraphs: ParagraphRow[];
  obligationWarningParagraphIds?: Set<string>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialParagraphs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (busy || editingId) return;
    setRows(initialParagraphs);
  }, [initialParagraphs, busy, editingId]);

  const visible = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.orderIndex - b.orderIndex);
    if (!showOnlyUnreviewed) return sorted;
    return sorted.filter((r) => r.reviewStatus !== "HUMAN_REVIEWED");
  }, [rows, showOnlyUnreviewed]);

  function startEdit(row: ParagraphRow) {
    setEditingId(row.id);
    setEditForm({
      paragraphId: row.paragraphId,
      kind: row.kind,
      quoteJa: row.quoteJa,
      obligationLevel: row.obligationLevel,
      notesJa: row.notesJa
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/paragraphs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました。");
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow(id: string) {
    if (!confirm("この項を削除しますか？")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/paragraphs/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "削除に失敗しました。");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="inline-flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOnlyUnreviewed}
            onChange={(e) => setShowOnlyUnreviewed(e.target.checked)}
          />
          未レビューのみ
        </label>
        <span className="text-slate-500">
          {visible.length} / {rows.length} 項
        </span>
      </div>
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      ) : null}
      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 w-16">項</th>
              <th className="px-3 py-2 w-24">区分</th>
              <th className="px-3 py-2">見出し / 本文</th>
              <th className="px-3 py-2 w-20">義務</th>
              <th className="px-3 py-2 w-28">レビュー</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((row) => (
              <tr key={row.id} className="align-top hover:bg-slate-50/70">
                <td className="px-3 py-2 font-mono text-xs">{row.paragraphId}</td>
                <td className="px-3 py-2 text-xs">
                  {JGAAP_PARAGRAPH_KIND_LABELS[row.kind as JgaapParagraphKind] ?? row.kind}
                </td>
                <td className="px-3 py-2">
                  {row.sectionPathJa ? (
                    <div className="text-[10px] text-slate-500 mb-1">{row.sectionPathJa}</div>
                  ) : null}
                  <p className="text-xs whitespace-pre-wrap line-clamp-4">{row.quoteJa}</p>
                  {obligationWarningParagraphIds?.has(row.paragraphId) ? (
                    <div className="mt-1 text-[10px] text-amber-800">義務レベル要確認</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  {JGAAP_OBLIGATION_LEVEL_LABELS[row.obligationLevel as JgaapObligationLevel] ??
                    row.obligationLevel}
                </td>
                <td className="px-3 py-2">
                  <ReviewStatusToggle paragraphId={row.id} initialStatus={row.reviewStatus} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <button type="button" className="secondary-button text-[10px] py-1" onClick={() => startEdit(row)}>
                      編集
                    </button>
                    <button
                      type="button"
                      className="secondary-button text-[10px] py-1 text-red-700"
                      onClick={() => void deleteRow(row.id)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalDialog
        open={Boolean(editingId && editForm)}
        title="項を編集"
        onClose={() => {
          setEditingId(null);
          setEditForm(null);
        }}
        footer={
          <>
            <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
              キャンセル
            </button>
            <button type="button" className="primary-button" disabled={busy} onClick={() => void saveEdit()}>
              保存
            </button>
          </>
        }
      >
        {editForm ? (
          <div className="space-y-3">
            <div>
              <label className="section-title">項番号</label>
              <input
                className="input"
                value={editForm.paragraphId}
                onChange={(e) => setEditForm({ ...editForm, paragraphId: e.target.value })}
              />
            </div>
            <div>
              <label className="section-title">区分</label>
              <select
                className="input"
                value={editForm.kind}
                onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })}
              >
                {KIND_OPTIONS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title">義務レベル</label>
              <select
                className="input"
                value={editForm.obligationLevel}
                onChange={(e) => setEditForm({ ...editForm, obligationLevel: e.target.value })}
              >
                {OBLIGATION_OPTIONS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-title">本文</label>
              <textarea
                className="textarea"
                rows={10}
                value={editForm.quoteJa}
                onChange={(e) => setEditForm({ ...editForm, quoteJa: e.target.value })}
              />
            </div>
            <div>
              <label className="section-title">メモ</label>
              <textarea
                className="textarea"
                rows={2}
                value={editForm.notesJa}
                onChange={(e) => setEditForm({ ...editForm, notesJa: e.target.value })}
              />
            </div>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
