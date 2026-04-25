"use client";

import { useState } from "react";

type C = {
  id: string;
  scientificName: string;
  family: string | null;
  commonNameJa: string | null;
  description: string | null;
  plantNetScore: number;
  rerankScore: number | null;
  rerankReason: string | null;
  rank: number;
};

type Props = {
  identificationId: string;
  initialSelectedId: string | null;
  initialFinalNote: string | null;
  candidates: C[];
};

export function RecordDetailClient(p: Props) {
  const [selectedId, setSelectedId] = useState(p.initialSelectedId ?? "");
  const [finalNote, setFinalNote] = useState(p.initialFinalNote ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/identify/${p.identificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCandidateId: selectedId || null,
          finalNote: finalNote.trim() || null
        })
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setMsg(d.error || "保存に失敗しました。");
        return;
      }
      setMsg("保存しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">確定候補（よく分かったと思うもの）</label>
        <select
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">未確定</option>
          {p.candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.commonNameJa ? `${c.commonNameJa}（${c.scientificName}）` : c.scientificName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">メモ</label>
        <textarea
          className="min-h-[100px] w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2 text-sm"
          value={finalNote}
          onChange={(e) => setFinalNote(e.target.value)}
          placeholder="野帳的メモ。写真は保存していないので、咲いていた日や付近の植生など"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-forest-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : "保存"}
        </button>
        {msg && <p className="text-sm text-forest-800/60">{msg}</p>}
      </div>
    </div>
  );
}
