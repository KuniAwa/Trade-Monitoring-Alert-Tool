import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PatchBody = {
  selectedCandidateId?: string | null;
  finalNote?: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return badRequest("id が必要です。");
  }

  const body = (await request.json().catch(() => ({}))) as PatchBody;
  const selectedCandidateId =
    body.selectedCandidateId === undefined
      ? undefined
      : body.selectedCandidateId === null || body.selectedCandidateId === ""
        ? null
        : String(body.selectedCandidateId);

  const finalNote =
    body.finalNote === undefined
      ? undefined
      : body.finalNote == null
        ? null
        : String(body.finalNote).trim() || null;

  const ex = await prisma.identification.findUnique({ where: { id } });
  if (!ex) {
    return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  }

  if (selectedCandidateId) {
    const c = await prisma.candidate.findFirst({
      where: { id: selectedCandidateId, identificationId: id }
    });
    if (!c) {
      return badRequest("候補がこの識別結果に紐づいていません。");
    }
  }

  const updated = await prisma.identification.update({
    where: { id },
    data: {
      ...(selectedCandidateId !== undefined ? { selectedCandidateId } : {}),
      ...(finalNote !== undefined ? { finalNote } : {})
    }
  });

  return NextResponse.json({ id: updated.id, ok: true });
}
