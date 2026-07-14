"use client";

import { useCallback, useState } from "react";
import type { NikkeiMarketSnapshot } from "@/lib/nikkeiSnapshot";

function fmt(v: number | null | undefined, d = 1): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return v.toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

function boolJa(v: boolean): string {
  return v ? "はい" : "いいえ";
}

function trendColor(up: boolean, down: boolean): string {
  if (up) return "text-up";
  if (down) return "text-down";
  return "text-slate-600";
}

function trendBg(up: boolean, down: boolean): string {
  if (up) return "bg-green-50";
  if (down) return "bg-red-50";
  return "bg-slate-50";
}

export function NikkeiMarketPanel() {
  const [snapshot, setSnapshot] = useState<NikkeiMarketSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market-snapshot", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        snapshot?: NikkeiMarketSnapshot;
        error?: string;
      };
      if (!data.ok || !data.snapshot) throw new Error(data.error ?? "取得に失敗しました");
      setSnapshot(data.snapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <section className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">日経先物・投資判断用指標</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            環境認識＝15分足、執行タイミング＝5分足。1時間足は参考。アラート条件は変更なし。「更新」で取得。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand active:bg-brand/5 disabled:opacity-50"
        >
          {loading ? "取得中…" : "更新"}
        </button>
      </div>

      {error && <p className="mb-2 rounded bg-red-50 p-2 text-xs text-down">{error}</p>}

      {snapshot?.staleDataWarning && (
        <p className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">{snapshot.staleDataWarning}</p>
      )}

      {!snapshot && !loading && !error && (
        <p className="py-4 text-center text-sm text-slate-500">
          「更新」ボタンを押すと、現在時点の指標を取得します。
        </p>
      )}

      {snapshot && (
        <div className="space-y-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>{snapshot.symbol}</span>
            <span>判定足: {snapshot.barTimeJst}</span>
            <span>取得: {snapshot.fetchedAtJst}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className={`rounded-lg px-3 py-2 ${trendBg(snapshot.trend15mUp, snapshot.trend15mDown)}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">環境認識</div>
              <div className="text-[11px] text-slate-500">
                15分足トレンド（EMA{snapshot.emaFast15mPeriod}/{snapshot.emaSlow15mPeriod}）
              </div>
              <div
                className={`mt-0.5 text-base font-bold ${trendColor(snapshot.trend15mUp, snapshot.trend15mDown)}`}
              >
                {snapshot.trend15mJa}
              </div>
            </div>
            <div className={`rounded-lg px-3 py-2 ${trendBg(snapshot.trend5mUp, snapshot.trend5mDown)}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">執行タイミング</div>
              <div className="text-[11px] text-slate-500">
                5分足トレンド（EMA{snapshot.emaFast5mPeriod}/{snapshot.emaSlow5mPeriod}）
              </div>
              <div
                className={`mt-0.5 text-base font-bold ${trendColor(snapshot.trend5mUp, snapshot.trend5mDown)}`}
              >
                {snapshot.trend5mJa}
              </div>
            </div>
          </div>

          {snapshot.fiveMin && (
            <MetricBlock title="5分足（執行タイミング）">
              <Row label="判定足" value={snapshot.fiveMin.barTimeJst} />
              <Row label="終値" value={fmt(snapshot.fiveMin.close)} />
              <Row label={`EMA(${snapshot.emaFast5mPeriod})`} value={fmt(snapshot.emaFast5m)} />
              <Row label={`EMA(${snapshot.emaSlow5mPeriod})`} value={fmt(snapshot.emaSlow5m)} />
              <Row label="20MA" value={fmt(snapshot.fiveMin.ma20)} />
              <Row label="ATR(14)" value={fmt(snapshot.fiveMin.atr14)} highlight />
              <Row label={snapshot.fiveMin.vwapLabel} value={fmt(snapshot.fiveMin.vwap)} />
              <Row
                label="終値 vs VWAP"
                value={
                  snapshot.fiveMin.vwap == null
                    ? "-"
                    : snapshot.fiveMin.close > snapshot.fiveMin.vwap
                    ? "VWAP上"
                    : snapshot.fiveMin.close < snapshot.fiveMin.vwap
                    ? "VWAP下"
                    : "VWAP付近"
                }
              />
            </MetricBlock>
          )}

          <MetricBlock title="15分足（環境認識）">
            <Row label="終値" value={fmt(snapshot.close)} />
            <Row label={`EMA(${snapshot.emaFast15mPeriod})`} value={fmt(snapshot.emaFast15m)} />
            <Row label={`EMA(${snapshot.emaSlow15mPeriod})`} value={fmt(snapshot.emaSlow15m)} />
            <Row label="20MA" value={fmt(snapshot.ma20_15m)} />
            <Row label="ATR(14)" value={fmt(snapshot.atr15)} highlight />
            <Row label={snapshot.vwapLabel} value={fmt(snapshot.vwap)} />
            <Row
              label="終値 vs VWAP"
              value={
                snapshot.vwap == null
                  ? "-"
                  : snapshot.close > snapshot.vwap
                  ? "VWAP上"
                  : snapshot.close < snapshot.vwap
                  ? "VWAP下"
                  : "VWAP付近"
              }
            />
            <Row label="ロング閾値（高+0.2×ATR）" value={fmt(snapshot.longThreshold)} />
            <Row label="ショート閾値（安−0.2×ATR）" value={fmt(snapshot.shortThreshold)} />
            <Row label="初ブレイク相当・ロング" value={boolJa(snapshot.firstBreakLong)} />
            <Row label="初ブレイク相当・ショート" value={boolJa(snapshot.firstBreakShort)} />
          </MetricBlock>

          <MetricBlock title={`参照高安（${snapshot.prevHlLabel}）`}>
            <Row label="前日高値" value={fmt(snapshot.prevHigh)} />
            <Row label="前日安値" value={fmt(snapshot.prevLow)} />
          </MetricBlock>

          <MetricBlock title="1時間足（参考・アラートと同じEMA20/50）">
            <Row label="トレンド判定" value={snapshot.trend1hJa} />
            <Row label="終値" value={fmt(snapshot.close1h)} />
            <Row label="EMA(20)" value={fmt(snapshot.ema20_1h)} />
            <Row label="EMA(50)" value={fmt(snapshot.ema50_1h)} />
          </MetricBlock>

          <MetricBlock title="押し率">
            <Row
              label="ロング想定"
              value={snapshot.oshiritsuLong == null ? "-" : `${fmt(snapshot.oshiritsuLong)}%`}
            />
            <Row label="ブレイク後最高値" value={fmt(snapshot.breakoutHigh)} />
            <Row
              label="ショート想定"
              value={snapshot.oshiritsuShort == null ? "-" : `${fmt(snapshot.oshiritsuShort)}%`}
            />
            <Row label="ブレイク後最安値" value={fmt(snapshot.breakoutLow)} />
          </MetricBlock>
        </div>
      )}
    </section>
  );
}

function MetricBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
      <div className="mb-1.5 text-xs font-semibold text-slate-600">{title}</div>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 text-[12px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium tabular-nums ${highlight ? "text-brand" : "text-slate-800"}`}>{value}</dd>
    </div>
  );
}
