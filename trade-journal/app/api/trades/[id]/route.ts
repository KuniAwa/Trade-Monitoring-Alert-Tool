import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computePnl, computeRMultiple } from "@/lib/tradeMath";
import type { Direction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const trade = await prisma.trade.findUnique({
    where: { id: params.id },
    include: { signal: true }
  });
  if (!trade) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, trade });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.trade.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const num = (v: unknown, fallback: number | null): number | null =>
    v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback;

  const direction = (body.direction === "short" || body.direction === "long"
    ? body.direction
    : existing.direction) as Direction;
  const entryPrice = num(body.entryPrice, existing.entryPrice) ?? existing.entryPrice;
  const exitPrice = "exitPrice" in body ? num(body.exitPrice, null) : existing.exitPrice;
  const quantity = num(body.quantity, existing.quantity) ?? existing.quantity;
  const stopPrice = "stopPrice" in body ? num(body.stopPrice, null) : existing.stopPrice;
  const takeProfit = "takeProfit" in body ? num(body.takeProfit, null) : existing.takeProfit;

  const core = { direction, entryPrice, exitPrice, quantity, stopPrice };

  const trade = await prisma.trade.update({
    where: { id: params.id },
    data: {
      direction,
      entryPrice,
      exitPrice,
      quantity,
      stopPrice,
      takeProfit,
      entryAt: body.entryAt ? new Date(String(body.entryAt)) : existing.entryAt,
      exitAt: "exitAt" in body ? (body.exitAt ? new Date(String(body.exitAt)) : null) : existing.exitAt,
      pnl: computePnl(core),
      rMultiple: computeRMultiple(core),
      reason: "reason" in body ? (body.reason as string) || null : existing.reason,
      emotion: "emotion" in body ? (body.emotion as string) || null : existing.emotion,
      note: "note" in body ? (body.note as string) || null : existing.note,
      isVirtual: "isVirtual" in body ? Boolean(body.isVirtual) : existing.isVirtual
    }
  });

  return NextResponse.json({ ok: true, trade });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.trade.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await prisma.trade.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
