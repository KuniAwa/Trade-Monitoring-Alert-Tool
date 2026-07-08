import type { Trade } from "@prisma/client";

export type TradePeriodKey = "today" | "week" | "month" | "30d" | "all" | "custom";

export interface TradeSummary {
  count: number;
  closedCount: number;
  winRate: number | null;
  totalPnl: number;
  avgR: number | null;
}

export interface TradePeriodOption {
  key: TradePeriodKey;
  label: string;
}

export interface TradeDateRange {
  from?: Date;
  to?: Date;
}

export const TRADE_PERIOD_OPTIONS: TradePeriodOption[] = [
  { key: "today", label: "日次" },
  { key: "week", label: "週次" },
  { key: "month", label: "月次" },
  { key: "30d", label: "30日" },
  { key: "all", label: "全期間" },
  { key: "custom", label: "期間指定" }
];

const JST_OFFSET_MINUTES = 9 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function asSingle(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseJstDateOnly(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, -JST_OFFSET_MINUTES, 0, 0));
}

function startOfJstDay(date: Date): Date {
  const shifted = new Date(date.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 0, -JST_OFFSET_MINUTES, 0, 0));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function resolveTradePeriod(searchParams?: Record<string, string | string[] | undefined>): {
  period: TradePeriodKey;
  range: TradeDateRange;
  fromInput: string;
  toInput: string;
  label: string;
} {
  const raw = asSingle(searchParams?.period);
  const period: TradePeriodKey =
    raw === "today" || raw === "week" || raw === "month" || raw === "30d" || raw === "all" || raw === "custom"
      ? raw
      : "month";

  const now = new Date();
  const todayStart = startOfJstDay(now);
  let range: TradeDateRange = {};

  if (period === "today") {
    range = { from: todayStart, to: addDays(todayStart, 1) };
  } else if (period === "week") {
    const shifted = new Date(todayStart.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
    const weekday = (shifted.getUTCDay() + 6) % 7;
    const weekStart = addDays(todayStart, -weekday);
    range = { from: weekStart, to: addDays(weekStart, 7) };
  } else if (period === "month") {
    const shifted = new Date(todayStart.getTime() + JST_OFFSET_MINUTES * 60 * 1000);
    const monthStart = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1, 0, -JST_OFFSET_MINUTES, 0, 0)
    );
    const nextMonthStart = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1, 0, -JST_OFFSET_MINUTES, 0, 0)
    );
    range = { from: monthStart, to: nextMonthStart };
  } else if (period === "30d") {
    range = { from: addDays(todayStart, -29), to: addDays(todayStart, 1) };
  } else if (period === "custom") {
    const from = parseJstDateOnly(asSingle(searchParams?.from));
    const toBase = parseJstDateOnly(asSingle(searchParams?.to));
    range = {
      from: from ?? undefined,
      to: toBase ? addDays(toBase, 1) : undefined
    };
  }

  const option = TRADE_PERIOD_OPTIONS.find((item) => item.key === period);
  return {
    period,
    range,
    fromInput: asSingle(searchParams?.from) ?? "",
    toInput: asSingle(searchParams?.to) ?? "",
    label: option?.label ?? "月次"
  };
}

export function buildTradeWhere(range: TradeDateRange): {
  entryAt?: { gte?: Date; lt?: Date };
} {
  if (!range.from && !range.to) return {};
  return {
    entryAt: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lt: range.to } : {})
    }
  };
}

export function summarizeTrades(trades: Array<Pick<Trade, "pnl" | "rMultiple">>): TradeSummary {
  const closed = trades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const rValues = trades.map((t) => t.rMultiple).filter((x): x is number => typeof x === "number");
  const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
  return {
    count: trades.length,
    closedCount: closed.length,
    winRate: closed.length ? wins / closed.length : null,
    totalPnl,
    avgR
  };
}
