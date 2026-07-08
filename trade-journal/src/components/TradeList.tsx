import Link from "next/link";
import type { Trade } from "@prisma/client";
import { fmtDateTimeJst, fmtNum, fmtSigned } from "@/lib/format";

export function TradeList({ trades, emptyLabel }: { trades: Trade[]; emptyLabel: string }) {
  if (!trades.length) {
    return (
      <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
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
                    t.direction === "long" ? "bg-green-100 text-up" : "bg-red-100 text-down"
                  }`}
                >
                  {t.direction === "long" ? "ロング" : "ショート"}
                </span>
                {t.isVirtual && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">仮想</span>
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
  );
}
