import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.jgaapCase.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "ケースが見つかりません。" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const topicLabel =
      body.topicLabel !== undefined ? String(body.topicLabel).trim() || null : existing.topicLabel;
    const transactionSummaryJa =
      body.transactionSummaryJa !== undefined
        ? String(body.transactionSummaryJa).trim()
        : existing.transactionSummaryJa;
    const initialQuestionJa =
      body.initialQuestionJa !== undefined
        ? String(body.initialQuestionJa).trim()
        : existing.initialQuestionJa;
    const notesJa = body.notesJa !== undefined ? String(body.notesJa) : existing.notesJa;

    if (!title || !transactionSummaryJa || !initialQuestionJa) {
      return NextResponse.json(
        { error: "title, transactionSummaryJa, initialQuestionJa は必須です。" },
        { status: 400 }
      );
    }

    const updated = await prisma.jgaapCase.update({
      where: { id: params.id },
      data: { title, topicLabel, transactionSummaryJa, initialQuestionJa, notesJa }
    });

    return NextResponse.json({
      case: {
        id: updated.id,
        title: updated.title,
        topicLabel: updated.topicLabel,
        transactionSummaryJa: updated.transactionSummaryJa,
        initialQuestionJa: updated.initialQuestionJa,
        notesJa: updated.notesJa,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ケースの更新に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
