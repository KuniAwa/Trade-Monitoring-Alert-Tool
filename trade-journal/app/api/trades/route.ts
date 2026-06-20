import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computePnl, computeRMultiple } from "@/lib/tradeMath";
import type { Direction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** entryAt に最も近い Signal を ±maxHours の窓で探す */
async function findNearestSignalId(entryAt: Date, maxHours = 6): Promise<string | null> {
  const windowMs = maxHours * 60 * 60 * 1000;
  const from = new Date(entryAt.getTime() - windowMs);
  const to = new Date(entryAt.getTime() + windowMs);
  const candidates = await prisma.signal.findMany({
    where: { barTime: { gte: from, lte: to } },
    select: { id: true, barTime: true }
  });
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestDiff = Math.abs(best.barTime.getTime() - entryAt.getTime());
  for (const c of candidates) {
    const diff = Math.abs(c.barTime.getTime() - entryAt.getTime());
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best.id;
}

export async function GET() {
  const trades = await prisma.trade.findMany({
    orderBy: { entryAt: "desc" },
    take: 200,
    include: { signal: { select: { id: true, barTime: true, alertDir: true } } }
  });
  return NextResponse.json({ ok: true, trades });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const direction = body.direction === "short" ? "short" : "long";
  const entryPrice = Number(body.entryPrice);
  if (!Number.isFinite(entryPrice)) {
    return NextResponse.json({ ok: false, error: "entryPrice は必須です" }, { status: 400 });
  }
  const entryAt = body.entryAt ? new Date(String(body.entryAt)) : new Date();
  if (Number.isNaN(entryAt.getTime())) {
    return NextResponse.json({ ok: false, error: "entryAt が不正です" }, { status: 400 });
  }

  const exitPrice = body.exitPrice != null && body.exitPrice !== "" ? Number(body.exitPrice) : null;
  const exitAt = body.exitAt ? new Date(String(body.exitAt)) : null;
  const quantity = body.quantity != null && body.quantity !== "" ? Number(body.quantity) : 1;
  const stopPrice = body.stopPrice != null && body.stopPrice !== "" ? Number(body.stopPrice) : null;
  const takeProfit = body.takeProfit != null && body.takeProfit !== "" ? Number(body.takeProfit) : null;

  const core = { direction: direction as Direction, entryPrice, exitPrice, quantity, stopPrice };
  const pnl = computePnl(core);
  const rMultiple = computeRMultiple(core);
  const signalId = (body.signalId as string) || (await findNearestSignalId(entryAt));

  const trade = await prisma.trade.create({
    data: {
      direction,
      entryAt,
      exitAt: exitAt && !Number.isNaN(exitAt.getTime()) ? exitAt : null,
      entryPrice,
      exitPrice,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      stopPrice,
      takeProfit,
      pnl,
      rMultiple,
      isVirtual: Boolean(body.isVirtual),
      reason: (body.reason as string) || null,
      emotion: (body.emotion as string) || null,
      note: (body.note as string) || null,
      signalId
    }
  });

  return NextResponse.json({ ok: true, trade });
}
