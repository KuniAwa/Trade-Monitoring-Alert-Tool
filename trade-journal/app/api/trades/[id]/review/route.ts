import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateTradeReview } from "@/lib/aiClient";
import { fetch15mBars, forwardBarsAfter } from "@/lib/nikkeiData";
import { computeOutcome } from "@/lib/outcome";
import { ensureSignalFeatures } from "@/lib/signalFeatureRead";
import { fmtJstForPrompt } from "@/lib/format";
import type { Direction, OutcomeLabel } from "@/lib/types";
import type { TradeReviewInput } from "@/prompts/tradeReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { signal: true }
  });
  if (!trade) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const direction = trade.direction as Direction;

  // 結果ラベル: エントリー後の値動き（同一データ = Yahoo 15分足）から算出
  let outcome: OutcomeLabel | null = null;
  try {
    const { bars } = await fetch15mBars("1mo");
    const epoch = Math.floor(trade.entryAt.getTime() / 1000);
    const fwd = forwardBarsAfter(bars, epoch, 16);
    if (fwd.length) {
      const riskWidth =
        trade.stopPrice != null ? Math.abs(trade.entryPrice - trade.stopPrice) : trade.signal?.atr15 ? trade.signal.atr15 * 1.5 : null;
      outcome = computeOutcome({
        direction,
        basePrice: trade.entryPrice,
        riskWidth,
        forwardBars: fwd
      });
    }
  } catch {
    outcome = null;
  }

  const signalForPrompt: TradeReviewInput["signal"] = trade.signal
    ? {
        barTime: fmtJstForPrompt(trade.signal.barTime),
        source: trade.signal.source,
        alertDir: trade.signal.alertDir,
        close: trade.signal.close,
        prevHigh: trade.signal.prevHigh,
        prevLow: trade.signal.prevLow,
        ma20: trade.signal.ma20,
        atr15: trade.signal.atr15,
        longThreshold: trade.signal.longThreshold,
        shortThreshold: trade.signal.shortThreshold,
        close1h: trade.signal.close1h,
        ema20_1h: trade.signal.ema20_1h,
        ema50_1h: trade.signal.ema50_1h,
        trendUp: trade.signal.trendUp,
        trendDown: trade.signal.trendDown,
        oshiritsuLong: trade.signal.oshiritsuLong,
        oshiritsuShort: trade.signal.oshiritsuShort,
        volumeRatio: trade.signal.volumeRatio,
        features: ensureSignalFeatures(trade.signal)
      }
    : null;

  const input: TradeReviewInput = {
    direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    quantity: trade.quantity,
    stopPrice: trade.stopPrice,
    takeProfit: trade.takeProfit,
    pnl: trade.pnl,
    rMultiple: trade.rMultiple,
    reason: trade.reason,
    emotion: trade.emotion,
    note: trade.note,
    entryAt: fmtJstForPrompt(trade.entryAt),
    exitAt: trade.exitAt ? fmtJstForPrompt(trade.exitAt) : null,
    signal: signalForPrompt,
    outcome
  };

  let review;
  try {
    review = await generateTradeReview(input);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "AI error" },
      { status: 502 }
    );
  }

  const reviewWithMeta = { ...review, outcome, generatedAt: new Date().toISOString() };
  await prisma.trade.update({
    where: { id: trade.id },
    data: { aiReviewJson: reviewWithMeta as unknown as Prisma.InputJsonValue }
  });

  return NextResponse.json({ ok: true, review: reviewWithMeta });
}
