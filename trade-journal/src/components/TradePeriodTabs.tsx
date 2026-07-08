import Link from "next/link";
import type { TradePeriodKey } from "@/lib/tradeSummary";
import { TRADE_PERIOD_OPTIONS } from "@/lib/tradeSummary";

export function TradePeriodTabs({
  basePath,
  current,
  from,
  to
}: {
  basePath: string;
  current: TradePeriodKey;
  from?: string;
  to?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TRADE_PERIOD_OPTIONS.map((option) => {
        const params = new URLSearchParams({ period: option.key });
        if (option.key === "custom") {
          if (from) params.set("from", from);
          if (to) params.set("to", to);
        }
        const href = `${basePath}?${params.toString()}`;
        const active = option.key === current;
        return (
          <Link
            key={option.key}
            href={href}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              active ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
