"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const HABITATS = [
  "",
  "林床",
  "湿地",
  "草原",
  "河原",
  "里山",
  "山地道沿い",
  "高山帯",
  "その他"
];

const ORGANS = [
  { v: "auto", l: "自動" },
  { v: "flower", l: "花" },
  { v: "leaf", l: "葉" },
  { v: "fruit", l: "実・果" },
  { v: "bark", l: "幹・樹皮" },
  { v: "habit", l: "全体（樹形）" },
  { v: "branch", l: "枝" }
];

export function IdentifyForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [capturedMonth, setCapturedMonth] = useState("");
  const [location, setLocation] = useState("");
  const [habitat, setHabitat] = useState("");
  const [userNote, setUserNote] = useState("");
  const [organ, setOrgan] = useState("auto");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("写真を選んでください。");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("image", file);
      fd.set("organ", organ);
      if (capturedMonth) fd.set("capturedMonth", capturedMonth);
      if (location.trim()) fd.set("location", location.trim());
      if (habitat) fd.set("habitat", habitat);
      if (userNote.trim()) fd.set("userNote", userNote.trim());

      const r = await fetch("/api/identify", { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok) {
        setError(d.error || "識別に失敗しました。");
        return;
      }
      if (d.id) {
        router.push(`/records/${d.id}`);
        router.refresh();
        return;
      }
      setError("応答が不正です。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">写真</label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="cursor-pointer rounded-lg border border-forest-800/20 bg-white px-3 py-2 text-center text-sm">
            撮影して選ぶ
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="cursor-pointer rounded-lg border border-forest-800/20 bg-white px-3 py-2 text-center text-sm">
            ライブラリから選ぶ
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {file && (
          <p className="mt-2 text-xs text-forest-800/70">
            選択中: {file.name}
          </p>
        )}
        <p className="mt-1 text-xs text-forest-800/50">
          1枚、同一個体。JPEG/PNG 推奨。撮影直後の HEIC も試せます。写真は保存されません。
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">主に写している部位</label>
        <select
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2"
          value={organ}
          onChange={(e) => setOrgan(e.target.value)}
        >
          {ORGANS.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">撮影月（任意・精度補助）</label>
        <select
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2"
          value={capturedMonth}
          onChange={(e) => setCapturedMonth(e.target.value)}
        >
          <option value="">未指定</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={String(m)}>
              {m}月
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">場所（任意・自由記述）</label>
        <input
          type="text"
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2"
          placeholder="例: 栃木県 奥日光 湿原 付近"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">生息イメージ（任意）</label>
        <select
          className="w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2"
          value={habitat}
          onChange={(e) => setHabitat(e.target.value)}
        >
          <option value="">未指定</option>
          {HABITATS.filter(Boolean).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">特徴メモ（任意）</label>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-forest-800/20 bg-white px-3 py-2 text-sm"
          placeholder="花の色、葉の形など"
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-forest-800 py-3 text-base font-medium text-white active:opacity-90 disabled:opacity-50"
      >
        {busy ? "送信中…" : "識別する"}
      </button>
    </form>
  );
}
