"use client";

import { useCallback, useEffect, useState } from "react";
import type { BucketStat, StatsSummary } from "@/lib/stats";
import type { ConditionDiscovery } from "@/lib/types";

interface AnalysisResponse {
  ok: boolean;
  stats?: StatsSummary;
  discovery?: ConditionDiscovery;
  forwardBarsAvailable?: boolean;
  signalCount?: number;
  tradeCount?: number;
  error?: string;
}

export default function AnalysisPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [meta, setMeta] = useState<{ signalCount: number; tradeCount: number; fwd: boolean } | null>(
    null
  );
  const [discovery, setDiscovery] = useState<ConditionDiscovery | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis", { cache: "no-store" });
      const data = (await res.json()) as AnalysisResponse;
      if (!data.ok || !data.stats) throw new Error(data.error ?? "集計に失敗しました");
      setStats(data.stats);
      setMeta({
        signalCount: data.signalCount ?? 0,
        tradeCount: data.tradeCount ?? 0,
        fwd: Boolean(data.forwardBarsAvailable)
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "集計に失敗しました");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function runAi() {
    setLoadingAi(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis", { method: "POST" });
      const data = (await res.json()) as AnalysisResponse;
      if (!data.ok || !data.discovery) throw new Error(data.error ?? "AI分析に失敗しました");
      setDiscovery(data.discovery);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI分析に失敗しました");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-base font-semibold text-slate-800">条件分析・改善仮説</h1>
      <p className="text-xs text-slate-500">
        アラートと同一データ（Yahoo の15分足・1時間足・出来高）から、実取引と仮想シグナルを母数に集計します。
        AIは現行アラート条件に縛られず、より良い売買条件の仮説を提案します。
      </p>

      {meta && (
        <div className="rounded-lg border bg-white p-3 text-xs text-slate-600">
          母数: 仮想シグナル {meta.signalCount} 件 / 実取引 {meta.tradeCount} 件
          {!meta.fwd && (
            <span className="ml-1 text-down">（前方足の取得に失敗。結果ラベルが一部欠損）</span>
          )}
        </div>
      )}

      {error && <p className="rounded bg-red-50 p-2 text-xs text-down">{error}</p>}

      {loadingStats ? (
        <p className="text-sm text-slate-500">集計中…</p>
      ) : stats ? (
        <div className="space-y-4">
          <BucketTable title="全体" rows={[stats.overall]} />
          <BucketTable title="方向別" rows={stats.byDirection} />
          <BucketTable title="1時間足トレンド整合" rows={stats.byTrendAlignment} />
          <BucketTable title="押し率帯" rows={stats.byOshiritsuBand} />
          <BucketTable title="時間帯" rows={stats.bySession} />
          <BucketTable title="ATRレジーム" rows={stats.byAtrRegime} />
          <BucketTable title="曜日" rows={stats.byWeekday} />
        </div>
      ) : null}

      <section className="space-y-3">
        <button
          type="button"
          onClick={runAi}
          disabled={loadingAi}
          className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow active:scale-[0.99] disabled:opacity-60"
        >
          {loadingAi ? "AIが条件を分析中…" : "AIに改善条件を分析してもらう"}
        </button>

        {discovery && (
          <div className="space-y-3 rounded-lg border bg-white p-3 text-sm">
            {discovery.overview && (
              <p className="rounded bg-brand/5 p-2 text-slate-700">{discovery.overview}</p>
            )}
            {discovery.hypotheses?.map((h, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-semibold text-brand">{h.name}</div>
                <dl className="mt-1 space-y-1 text-[13px] text-slate-700">
                  <Row k="条件" v={h.condition} />
                  <Row k="根拠" v={h.rationale} />
                  <Row k="期待効果" v={h.expectedEffect} />
                  <Row k="検証方法" v={h.validation} />
                  {h.caveat && <Row k="注意" v={h.caveat} />}
                </dl>
              </div>
            ))}
            {discovery.limitations?.length > 0 && (
              <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-500">
                限界: {discovery.limitations.join(" / ")}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-[11px] text-slate-400">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}

function pct(v: number | null): string {
  return v == null ? "-" : `${Math.round(v * 100)}%`;
}
function num(v: number | null, d = 1): string {
  return v == null || !Number.isFinite(v) ? "-" : v.toFixed(d);
}

function BucketTable({ title, rows }: { title: string; rows: BucketStat[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div>
      <h2 className="mb-1 text-xs font-semibold text-slate-600">{title}</h2>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">区分</th>
              <th className="px-2 py-1.5 text-right font-medium">件数</th>
              <th className="px-2 py-1.5 text-right font-medium">勝率</th>
              <th className="px-2 py-1.5 text-right font-medium">1R率</th>
              <th className="px-2 py-1.5 text-right font-medium">平均R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.bucket} className="border-t">
                <td className="px-2 py-1.5">{r.bucket}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.count}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{pct(r.winRate)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{pct(r.hit1RRate)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{num(r.avgR, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
