import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const row = await prisma.summaryLibrary.findUnique({
    where: { id }
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: row.id,
    title: row.title,
    topicLabel: row.topicLabel,
    framework: row.framework,
    content: row.content,
    sourceLinks: row.sourceLinks
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const row = await prisma.summaryLibrary.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const topicLabel =
    body.topicLabel === null || body.topicLabel === ""
      ? null
      : typeof body.topicLabel === "string"
        ? body.topicLabel.trim() || null
        : undefined;
  const framework =
    typeof body.framework === "string" && ["JGAAP", "IFRS", "BOTH"].includes(body.framework)
      ? body.framework
      : undefined;
  const content = typeof body.content === "string" ? body.content : undefined;
  const sourceLinks = typeof body.sourceLinks === "string" ? body.sourceLinks : undefined;

  const updated = await prisma.summaryLibrary.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(topicLabel !== undefined && { topicLabel }),
      ...(framework !== undefined && { framework }),
      ...(content !== undefined && { content }),
      ...(sourceLinks !== undefined && { sourceLinks })
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const row = await prisma.summaryLibrary.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.summaryLibrary.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
