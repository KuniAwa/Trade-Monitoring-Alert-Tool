export function fmtNum(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return v.toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function fmtSigned(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "-";
  const s = fmtNum(Math.abs(v), decimals);
  return v > 0 ? `+${s}` : v < 0 ? `-${s}` : s;
}

export function fmtPct(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtDateTimeJst(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
