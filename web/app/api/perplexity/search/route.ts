import { NextRequest, NextResponse } from "next/server";
import { searchPerplexity } from "@/lib/perplexity";

export async function POST(req: NextRequest) {
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };

  if (!query || !query.trim()) {
    return NextResponse.json(
      { ok: false, error: "query is required", results: [] },
      { status: 400 }
    );
  }

  const results = await searchPerplexity(query.trim());

  return NextResponse.json({ ok: true, results });
}

