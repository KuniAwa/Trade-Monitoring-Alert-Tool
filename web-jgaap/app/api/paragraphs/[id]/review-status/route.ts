import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STATUSES = new Set(["UNREVIEWED", "HUMAN_REVIEWED"]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.jgaapParagraph.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "項が見つかりません。" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const reviewStatus = String(body.reviewStatus ?? existing.reviewStatus).trim();
    const reviewedNoteJa =
      body.reviewedNoteJa !== undefined ? String(body.reviewedNoteJa) : existing.reviewedNoteJa;

    if (!STATUSES.has(reviewStatus)) {
      return NextResponse.json({ error: "reviewStatus が不正です。" }, { status: 400 });
    }

    const paragraph = await prisma.jgaapParagraph.update({
      where: { id: params.id },
      data: {
        reviewStatus,
        reviewedNoteJa,
        reviewedAt: reviewStatus === "HUMAN_REVIEWED" ? new Date() : null
      }
    });

    return NextResponse.json({
      paragraph: {
        id: paragraph.id,
        reviewStatus: paragraph.reviewStatus,
        reviewedAt: paragraph.reviewedAt,
        reviewedNoteJa: paragraph.reviewedNoteJa
      },
      reviewStatus: paragraph.reviewStatus
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "レビュー状態の更新に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
