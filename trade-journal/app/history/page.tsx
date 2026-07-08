import Link from "next/link";
import { TradeList } from "@/components/TradeList";
import { TradePeriodTabs } from "@/components/TradePeriodTabs";
import { fmtDateTimeJst, fmtPct, fmtSigned } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildTradeWhere, resolveTradePeriod, summarizeTrades } from "@/lib/tradeSummary";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const periodState = resolveTradePeriod(searchParams);
  const where = buildTradeWhere(periodState.range);
  const trades = await prisma.trade.findMany({
    where,
    orderBy: { entryAt: "desc" }
  });
  const summary = summarizeTrades(trades);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-800">取引履歴・期間集計</h1>
            <p className="mt-1 text-xs text-slate-500">日次・週次・月次・任意期間で取引数、勝率、損益合計、平均Rを確認できます。</p>
          </div>
          <Link href="/trades/new" className="text-xs font-semibold text-brand">
            ＋ 新規記録
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          <TradePeriodTabs
            basePath="/history"
            current={periodState.period}
            from={periodState.fromInput}
            to={periodState.toInput}
          />
          <form action="/history" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
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
        <KpiCard label={`${periodState.label}の取引数`} value={`${summary.count} 件`} />
        <KpiCard label="勝率（決済済み）" value={summary.winRate == null ? "-" : fmtPct(summary.winRate)} />
        <KpiCard
          label="損益合計（値幅×数量）"
          value={fmtSigned(summary.totalPnl)}
          tone={summary.totalPnl > 0 ? "up" : summary.totalPnl < 0 ? "down" : "neutral"}
        />
        <KpiCard label="平均R" value={summary.avgR == null ? "-" : fmtSigned(summary.avgR, 2)} />
      </section>

      <section className="rounded-lg border bg-white p-3 text-xs text-slate-600">
        集計対象: <b>{periodState.label}</b>
        <span className="ml-1">（決済済み {summary.closedCount} 件）</span>
        {trades[0] ? <div className="mt-1 text-[11px] text-slate-400">最新記録 {fmtDateTimeJst(trades[0].entryAt)}</div> : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">対象期間の取引</h2>
          <Link href="/" className="text-xs text-brand">
            ← ホームへ
          </Link>
        </div>
        <TradeList trades={trades} emptyLabel="この期間の取引はありません。" />
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
