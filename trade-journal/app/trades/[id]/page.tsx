import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TradeReviewClient } from "@/components/TradeReviewClient";
import { ensureSignalFeatures } from "@/lib/signalFeatureRead";
import { fmtDateTimeJst, fmtNum, fmtSigned } from "@/lib/format";
import type { OutcomeLabel, TradeReview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({ params }: { params: { id: string } }) {
  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { signal: true }
  });
  if (!trade) notFound();

  const features = trade.signal ? ensureSignalFeatures(trade.signal) : null;
  const review = (trade.aiReviewJson as (TradeReview & { outcome?: OutcomeLabel | null }) | null) ?? null;

  return (
    <div className="space-y-4">
      <Link href="/" className="text-xs text-brand">
        ← 一覧へ
      </Link>

      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              trade.direction === "long" ? "bg-green-100 text-up" : "bg-red-100 text-down"
            }`}
          >
            {trade.direction === "long" ? "ロング" : "ショート"}
          </span>
          {trade.isVirtual && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">仮想</span>
          )}
          <span className="text-xs text-slate-500">{fmtDateTimeJst(trade.entryAt)}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <Cell label="建値" value={fmtNum(trade.entryPrice)} />
          <Cell label="決済" value={trade.exitPrice == null ? "保有中" : fmtNum(trade.exitPrice)} />
          <Cell label="数量" value={`${fmtNum(trade.quantity)} 枚`} />
          <Cell label="損切り" value={trade.stopPrice == null ? "-" : fmtNum(trade.stopPrice)} />
          <Cell
            label="損益"
            value={trade.pnl == null ? "—" : fmtSigned(trade.pnl)}
            tone={(trade.pnl ?? 0) > 0 ? "up" : (trade.pnl ?? 0) < 0 ? "down" : "neutral"}
          />
          <Cell
            label="R倍率"
            value={trade.rMultiple == null ? "-" : `${fmtSigned(trade.rMultiple, 2)}R`}
          />
        </div>
        {(trade.reason || trade.emotion || trade.note) && (
          <div className="mt-3 space-y-1 border-t pt-3 text-xs text-slate-600">
            {trade.reason && <p>根拠: {trade.reason}</p>}
            {trade.emotion && <p>メンタル: {trade.emotion}</p>}
            {trade.note && <p>メモ: {trade.note}</p>}
          </div>
        )}
      </section>

      {trade.signal && (
        <section className="rounded-lg border bg-white p-4 text-sm">
          <h2 className="mb-2 text-xs font-semibold text-slate-500">
            エントリー時点の市況（アラートと同一データ由来）
          </h2>
          <div className="grid grid-cols-2 gap-y-1.5 text-[13px]">
            <Cell label="判定足" value={fmtDateTimeJst(trade.signal.barTime)} />
            <Cell
              label="アラート"
              value={trade.signal.alertDir ? (trade.signal.alertDir === "long" ? "ロング発火" : "ショート発火") : "未発火"}
            />
            <Cell label="終値" value={fmtNum(trade.signal.close)} />
            <Cell label="20MA(15分)" value={fmtNum(trade.signal.ma20)} />
            <Cell label="前日高値" value={fmtNum(trade.signal.prevHigh)} />
            <Cell label="前日安値" value={fmtNum(trade.signal.prevLow)} />
            <Cell label="ATR(15分)" value={fmtNum(trade.signal.atr15, 1)} />
            <Cell
              label="1h環境"
              value={trade.signal.trendUp ? "上昇" : trade.signal.trendDown ? "下降" : "中立"}
            />
            <Cell
              label="押し率"
              value={
                trade.direction === "long"
                  ? trade.signal.oshiritsuLong == null
                    ? "-"
                    : `${fmtNum(trade.signal.oshiritsuLong)}%`
                  : trade.signal.oshiritsuShort == null
                  ? "-"
                  : `${fmtNum(trade.signal.oshiritsuShort)}%`
              }
            />
            <Cell
              label="出来高倍率"
              value={trade.signal.volumeRatio == null ? "-" : `${fmtNum(trade.signal.volumeRatio, 2)}x`}
            />
          </div>
          {features && (
            <div className="mt-2 border-t pt-2 text-[11px] text-slate-500">
              拡張特徴量: 時間帯 {features.sessionBucket ?? "-"} / ATRレジーム {features.atrRegime ?? "-"} /
              RSI14 {features.rsi14 == null ? "-" : features.rsi14.toFixed(0)} / 20MA乖離{" "}
              {features.ma20DeviationPct == null ? "-" : `${features.ma20DeviationPct.toFixed(2)}%`}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">AIによる改善分析</h2>
        <TradeReviewClient tradeId={trade.id} initialReview={review} />
      </section>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  const color = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-slate-800";
  return (
    <div>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className={`font-medium ${color}`}>{value}</div>
    </div>
  );
}
