"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OutcomeLabel, TradeReview } from "@/lib/types";

type ReviewWithMeta = TradeReview & { outcome?: OutcomeLabel | null; generatedAt?: string };

export function TradeReviewClient({
  tradeId,
  initialReview
}: {
  tradeId: string;
  initialReview: ReviewWithMeta | null;
}) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewWithMeta | null>(initialReview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trades/${tradeId}/review`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; review?: ReviewWithMeta; error?: string };
      if (!data.ok || !data.review) throw new Error(data.error ?? "分析に失敗しました");
      setReview(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm("この取引を削除しますか？")) return;
    await fetch(`/api/trades/${tradeId}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "AIが分析中…" : review ? "AI分析を再実行" : "AIに改善点を分析してもらう"}
      </button>

      {error && <p className="rounded bg-red-50 p-2 text-xs text-down">{error}</p>}

      {review && (
        <div className="space-y-3 rounded-lg border bg-white p-3 text-sm">
          {review.summary && (
            <p className="rounded bg-brand/5 p-2 text-slate-700">{review.summary}</p>
          )}
          <ReviewList title="所見" items={review.observations} />
          <ReviewList title="良かった点" items={review.goodPoints} tone="up" />
          <ReviewList title="改善点（条件以外も含む）" items={review.improvements} tone="down" />
          <ReviewList title="次回アクション" items={review.nextActions} />
          {review.outcome && (
            <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-500">
              結果ラベル: 前方リターン {fmt(review.outcome.forwardReturn)} / MFE {fmt(review.outcome.mfe)} /
              MAE {fmt(review.outcome.mae)} / 1R {flag(review.outcome.hit1R)} / 2R{" "}
              {flag(review.outcome.hit2R)}
            </div>
          )}
          {review.generatedAt && (
            <p className="text-[10px] text-slate-400">生成: {review.generatedAt}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={remove}
        className="w-full rounded-lg border border-red-200 py-2 text-xs font-medium text-down active:bg-red-50"
      >
        この取引を削除
      </button>
    </div>
  );
}

function ReviewList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone?: "up" | "down";
}) {
  if (!items || items.length === 0) return null;
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-slate-700";
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold ${color}`}>{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-700">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  return v == null || !Number.isFinite(v) ? "-" : v.toFixed(1);
}
function flag(v: boolean | null | undefined): string {
  return v == null ? "-" : v ? "達成" : "未達";
}
