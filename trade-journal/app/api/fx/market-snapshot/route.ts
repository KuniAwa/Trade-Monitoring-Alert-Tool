import { NextRequest, NextResponse } from "next/server";
import { fxPairById } from "@/lib/markets";
import { buildFxMarketSnapshot } from "@/lib/nikkeiSnapshot";
import { fetchBarsForSymbol } from "@/lib/yahooData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 選択した FX ペアの現時点指標（DB保存なし・Yahooから都度取得）。 */
export async function GET(req: NextRequest) {
  const pairId = req.nextUrl.searchParams.get("pair") ?? "";
  const pair = fxPairById(pairId);
  if (!pair) {
    return NextResponse.json({ ok: false, error: "通貨ペアを選択してください" }, { status: 400 });
  }
  try {
    const [m15, h1, m5Result] = await Promise.all([
      fetchBarsForSymbol(pair.yahoo, "15m", "1mo"),
      fetchBarsForSymbol(pair.yahoo, "60m", "1mo"),
      fetchBarsForSymbol(pair.yahoo, "5m", "5d").catch(() => null)
    ]);
    const snapshot = buildFxMarketSnapshot(pair.yahoo, m15.bars, h1.bars, m5Result?.bars);
    if (!snapshot) {
      return NextResponse.json(
        { ok: false, error: "スナップショットを構築できませんでした（データ不足）" },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true, snapshot, pair: { id: pair.id, label: pair.label } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "データ取得に失敗しました" },
      { status: 502 }
    );
  }
}
