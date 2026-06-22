import Link from "next/link";
import { NikkeiMarketPanel } from "@/components/NikkeiMarketPanel";
import { prisma } from "@/lib/prisma";
import { fmtDateTimeJst, fmtNum, fmtSigned } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getData() {
  const [trades, signalCount, lastSignal] = await Promise.all([
    prisma.trade.findMany({
      orderBy: { entryAt: "desc" },
      take: 20,
      include: { signal: { select: { alertDir: true } } }
    }),
    prisma.signal.count(),
    prisma.signal.findFirst({ orderBy: { barTime: "desc" }, select: { barTime: true } })
  ]);

  const closed = trades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const totalPnl = closed.reduce((a, t) => a + (t.pnl ?? 0), 0);
  const rValues = trades.map((t) => t.rMultiple).filter((x): x is number => typeof x === "number");
  const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;

  return {
    trades,
    signalCount,
    lastSignal,
    kpi: {
      count: trades.length,
      winRate: closed.length ? wins / closed.length : null,
      totalPnl,
      avgR
    }
  };
}

export default async function DashboardPage() {
  const { trades, signalCount, lastSignal, kpi } = await getData();

  return (
    <div className="space-y-5">
      <NikkeiMarketPanel />

      <section className="grid grid-cols-2 gap-3">
        <KpiCard label="記録した取引" value={`${kpi.count} 件`} />
        <KpiCard
          label="勝率（決済済み）"
          value={kpi.winRate == null ? "-" : `${Math.round(kpi.winRate * 100)}%`}
        />
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
          シグナルは日経アラートと同一データ（Yahoo の15分足・1時間足・出来高）から自動取込されます。
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">最近の取引</h2>
          <Link href="/trades/new" className="text-xs font-semibold text-brand">
            ＋ 新規記録
          </Link>
        </div>
        {trades.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-slate-500">
            まだ取引がありません。右上の「取引を記録」から登録してください。
          </div>
        ) : (
          <ul className="space-y-2">
            {trades.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trades/${t.id}`}
                  className="flex items-center justify-between rounded-lg border bg-white p-3 active:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          t.direction === "long"
                            ? "bg-green-100 text-up"
                            : "bg-red-100 text-down"
                        }`}
                      >
                        {t.direction === "long" ? "ロング" : "ショート"}
                      </span>
                      {t.isVirtual && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          仮想
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{fmtDateTimeJst(t.entryAt)}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      建値 {fmtNum(t.entryPrice)}
                      {t.exitPrice != null ? ` → 決済 ${fmtNum(t.exitPrice)}` : "（保有中）"}
                    </div>
                  </div>
                  <div className="ml-3 text-right">
                    <div
                      className={`text-sm font-semibold ${
                        (t.pnl ?? 0) > 0 ? "text-up" : (t.pnl ?? 0) < 0 ? "text-down" : "text-slate-400"
                      }`}
                    >
                      {t.pnl == null ? "—" : fmtSigned(t.pnl)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t.rMultiple == null ? "" : `${fmtSigned(t.rMultiple, 2)}R`}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
