import { NextResponse } from "next/server";
import { fetch15mBars, fetch1hBars, fetch5mBars } from "@/lib/nikkeiData";
import { buildNikkeiMarketSnapshot } from "@/lib/nikkeiSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 日経先物の現時点指標（DB保存なし・Yahooから都度取得）。 */
export async function GET() {
  try {
    const [m15, h1, m5Result] = await Promise.all([
      fetch15mBars("1mo"),
      fetch1hBars("1mo"),
      fetch5mBars("5d").catch(() => null)
    ]);
    const snapshot = buildNikkeiMarketSnapshot(
      m15.symbol,
      m15.bars,
      h1.bars,
      m5Result?.bars
    );
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, error: "スナップショットを構築できませんでした（データ不足）" },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "データ取得に失敗しました" },
      { status: 502 }
    );
  }
}
