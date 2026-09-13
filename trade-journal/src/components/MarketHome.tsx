import Link from "next/link";
import { FxMarketPanel } from "@/components/FxMarketPanel";
import { NikkeiMarketPanel } from "@/components/NikkeiMarketPanel";
import { TradeList } from "@/components/TradeList";
import { TradePeriodTabs } from "@/components/TradePeriodTabs";
import { fmtDateTimeJst, fmtPct, fmtSigned } from "@/lib/format";
import {
  displaySymbol,
  marketBasePath,
  marketLabel,
  type MarketKind
} from "@/lib/markets";
import { prisma } from "@/lib/prisma";
import { buildTradeWhere, resolveTradePeriod, summarizeTrades } from "@/lib/tradeSummary";

export async function MarketHome({
  market,
  searchParams
}: {
  market: MarketKind;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const base = marketBasePath(market);
  const periodState = resolveTradePeriod(searchParams);
  const where = { ...buildTradeWhere(periodState.range), market };

  const [summaryTrades, recentTrades, signalCount, lastSignal] = await Promise.all([
    prisma.trade.findMany({ where, select: { pnl: true, rMultiple: true } }),
    prisma.trade.findMany({
      where,
      orderBy: { entryAt: "desc" },
      take: 20
    }),
    prisma.signal.count({ where: { market } }),
    prisma.signal.findFirst({
      where: { market },
      orderBy: { barTime: "desc" },
      select: { barTime: true }
    })
  ]);

  const kpi = summarizeTrades(summaryTrades);

  return (
    <div className="space-y-5">
      {market === "fx" ? <FxMarketPanel /> : <NikkeiMarketPanel />}

      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">取引集計（{marketLabel(market)}）</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {market === "fx"
                ? "USD/JPY・EUR/JPY・AUD/JPY をまとめて集計します。"
                : "全取引履歴を保存したまま、期間を切り替えて集計できます。"}
            </p>
          </div>
          <Link href={`${base}/history`} className="text-xs font-semibold text-brand">
            履歴を見る →
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          <TradePeriodTabs
            basePath={base}
            current={periodState.period}
            from={periodState.fromInput}
            to={periodState.toInput}
          />
          <form action={base} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            <input type="hidden" name="period" value="custom" />
            <label className="block text-[11px] text-slate-500">
              開始日
              <input
                type="date"
                name="from"
                defaultValue={periodState.fromInput}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </label>
            <label className="block text-[11px] text-slate-500">
              終了日
              <input
                type="date"
                name="to"
                defaultValue={periodState.toInput}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
            </label>
            <button
              type="submit"
              className="col-span-2 rounded-full border border-brand px-3 py-2 text-xs font-semibold text-brand sm:col-span-1"
            >
              期間指定で集計
            </button>
          </form>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <KpiCard label={`${periodState.label}の取引数`} value={`${kpi.count} 件`} />
        <KpiCard label="勝率（決済済み）" value={kpi.winRate == null ? "-" : fmtPct(kpi.winRate)} />
        <KpiCard
          label="損益合計（値幅×数量）"
          value={fmtSigned(kpi.totalPnl)}
          tone={kpi.totalPnl > 0 ? "up" : kpi.totalPnl < 0 ? "down" : "neutral"}
        />
        <KpiCard label="平均R" value={kpi.avgR == null ? "-" : fmtSigned(kpi.avgR, 2)} />
      </section>

      <section className="rounded-lg border bg-white p-3 text-xs text-slate-600">
        蓄積シグナル: <b>{signalCount.toLocaleString()}</b> 件
        {lastSignal ? `（最新 ${fmtDateTimeJst(lastSignal.barTime)}）` : "（未取込）"}
        <div className="mt-1 text-[11px] text-slate-400">
          {market === "fx"
            ? "シグナルは Yahoo の15分足・1時間足から自動取込されます（3通貨ペア合算）。"
            : "シグナルは日経アラートと同一データ（Yahoo の15分足・1時間足・出来高）から自動取込されます。"}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">最近の取引</h2>
          <Link href={`${base}/trades/new`} className="text-xs font-semibold text-brand">
            ＋ 新規記録
          </Link>
        </div>
        <TradeList
          trades={recentTrades}
          market={market}
          emptyLabel="この期間の取引はありません。右上の「取引を記録」から登録してください。"
          symbolLabel={(t) => displaySymbol(market, t.symbol)}
        />
      </section>
    </div>
  );
}

function KpiCard({
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
    <div className="rounded-lg border bg-white p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
