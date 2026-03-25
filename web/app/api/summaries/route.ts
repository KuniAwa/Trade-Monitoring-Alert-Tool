import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.summaryLibrary.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      topicLabel: true,
      framework: true,
      updatedAt: true
    }
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  let body: { duplicateFromId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const duplicateFromId = body.duplicateFromId;
  if (typeof duplicateFromId !== "string" || !duplicateFromId.trim()) {
    return NextResponse.json({ error: "duplicateFromId is required" }, { status: 400 });
  }
  const source = await prisma.summaryLibrary.findUnique({
    where: { id: duplicateFromId.trim() }
  });
  if (!source) {
    return NextResponse.json({ error: "Source summary not found" }, { status: 404 });
  }
  const created = await prisma.summaryLibrary.create({
    data: {
      title: `${source.title} (コピー)`,
      topicLabel: source.topicLabel,
      framework: source.framework,
      content: source.content,
      sourceLinks: source.sourceLinks
    }
  });
  return NextResponse.json(created);
}
