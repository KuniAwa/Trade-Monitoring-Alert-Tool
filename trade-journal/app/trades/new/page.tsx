"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function NewTradePage() {
  const router = useRouter();
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [entryAt, setEntryAt] = useState(nowLocalInput());
  const [entryPrice, setEntryPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [stopPrice, setStopPrice] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [exitAt, setExitAt] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [reason, setReason] = useState("");
  const [emotion, setEmotion] = useState("");
  const [note, setNote] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!entryPrice) {
      setError("建値（エントリー価格）を入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          entryAt: entryAt ? new Date(entryAt).toISOString() : undefined,
          entryPrice,
          quantity,
          stopPrice: stopPrice || null,
          takeProfit: takeProfit || null,
          exitAt: exitAt ? new Date(exitAt).toISOString() : null,
          exitPrice: exitPrice || null,
          reason,
          emotion,
          note,
          isVirtual
        })
      });
      const data = (await res.json()) as { ok: boolean; trade?: { id: string }; error?: string };
      if (!data.ok || !data.trade) throw new Error(data.error ?? "保存に失敗しました");
      router.push(`/trades/${data.trade.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold text-slate-800">取引を記録</h1>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection("long")}
          className={`rounded-lg border py-3 text-sm font-semibold ${
            direction === "long" ? "border-up bg-green-50 text-up" : "bg-white text-slate-500"
          }`}
        >
          ロング（買い）
        </button>
        <button
          type="button"
          onClick={() => setDirection("short")}
          className={`rounded-lg border py-3 text-sm font-semibold ${
            direction === "short" ? "border-down bg-red-50 text-down" : "bg-white text-slate-500"
          }`}
        >
          ショート（売り）
        </button>
      </div>

      <Field label="エントリー時刻">
        <input
          type="datetime-local"
          value={entryAt}
          onChange={(e) => setEntryAt(e.target.value)}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="建値 *">
          <input
            inputMode="decimal"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="例: 39200"
            className="input"
          />
        </Field>
        <Field label="数量（枚）">
          <input
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="損切り価格">
          <input
            inputMode="decimal"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="任意"
            className="input"
          />
        </Field>
        <Field label="利確目標">
          <input
            inputMode="decimal"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="任意"
            className="input"
          />
        </Field>
      </div>

      <details className="rounded-lg border bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-600">
          決済情報（任意・保有中なら未入力）
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="決済時刻">
            <input
              type="datetime-local"
              value={exitAt}
              onChange={(e) => setExitAt(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="決済価格">
            <input
              inputMode="decimal"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </details>

      <Field label="エントリー根拠（メモ）">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="例: 前日高値ブレイク + 1時間足上昇環境"
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="メンタル/タグ">
          <input
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            placeholder="例: 焦り / 計画通り"
            className="input"
          />
        </Field>
        <Field label="自由記述">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={isVirtual}
          onChange={(e) => setIsVirtual(e.target.checked)}
          className="h-4 w-4"
        />
        仮想取引（アラートを擬似エントリーとして記録）
      </label>

      {error && <p className="rounded bg-red-50 p-2 text-xs text-down">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? "保存中…" : "保存する"}
      </button>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.6rem 0.7rem;
          font-size: 16px;
          background: #fff;
        }
        .input:focus { outline: 2px solid #1d4ed8; outline-offset: -1px; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
