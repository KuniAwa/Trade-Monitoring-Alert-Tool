import { NextResponse } from "next/server";

import { isObligationLevel, isParagraphKind, refreshParagraphCount } from "@/lib/jgaapIngest";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const existing = await prisma.jgaapParagraph.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "項が見つかりません。" }, { status: 404 });
    }

    const paragraphId = String(body.paragraphId ?? existing.paragraphId).trim();
    const kind = String(body.kind ?? existing.kind).trim();
    const quoteJa = String(body.quoteJa ?? existing.quoteJa).trim();
    const obligationLevel = String(body.obligationLevel ?? existing.obligationLevel).trim();
    const notesJa = String(body.notesJa ?? existing.notesJa).trim();

    if (!paragraphId || !quoteJa) {
      return NextResponse.json({ error: "paragraphId と quoteJa は必須です。" }, { status: 400 });
    }
    if (!isParagraphKind(kind) || !isObligationLevel(obligationLevel)) {
      return NextResponse.json({ error: "kind または obligationLevel が不正です。" }, { status: 400 });
    }

    if (paragraphId !== existing.paragraphId) {
      const conflict = await prisma.jgaapParagraph.findUnique({
        where: { standardId_paragraphId: { standardId: existing.standardId, paragraphId } }
      });
      if (conflict && conflict.id !== existing.id) {
        return NextResponse.json({ error: "項番号が既に存在します。" }, { status: 409 });
      }
    }

    const paragraph = await prisma.jgaapParagraph.update({
      where: { id: params.id },
      data: {
        paragraphId,
        kind,
        quoteJa,
        obligationLevel,
        notesJa,
        editedManually: true,
        editedAt: new Date()
      }
    });

    return NextResponse.json({ paragraph });
  } catch (err) {
    const message = err instanceof Error ? err.message : "項の更新に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.jgaapParagraph.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "項が見つかりません。" }, { status: 404 });
    }

    await prisma.jgaapParagraph.delete({ where: { id: params.id } });
    await refreshParagraphCount(existing.standardId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "項の削除に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
