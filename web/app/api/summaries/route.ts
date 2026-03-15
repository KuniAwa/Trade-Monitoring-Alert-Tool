import { NextResponse } from "next/server";
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
