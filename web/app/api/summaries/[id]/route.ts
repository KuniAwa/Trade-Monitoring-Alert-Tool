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
