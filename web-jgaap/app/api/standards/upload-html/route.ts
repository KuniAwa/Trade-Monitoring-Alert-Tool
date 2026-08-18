import { NextResponse } from "next/server";

import { ingestAsbjHtml } from "@/lib/jgaapIngest";
import { MAX_HTML_UPLOAD_BYTES } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "HTML ファイルが必要です。" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (file.type && !file.type.includes("html") && !name.endsWith(".html") && !name.endsWith(".htm")) {
      return NextResponse.json({ error: "HTML のみアップロードできます。" }, { status: 400 });
    }

    if (file.size > MAX_HTML_UPLOAD_BYTES) {
      return NextResponse.json({ error: "HTML は 4 MB 以下にしてください。" }, { status: 413 });
    }

    const html = await file.text();
    if (!html.trim()) {
      return NextResponse.json({ error: "HTML が空です。" }, { status: 422 });
    }

    const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
    const licenseNote = String(formData.get("licenseNote") ?? "").trim() || null;

    const result = await ingestAsbjHtml({ html, sourceUrl, licenseNote });

    return NextResponse.json({
      id: result.standard.id,
      standardId: result.standard.standardId,
      titleJa: result.standard.titleJa,
      paragraphCount: result.standard.paragraphCount,
      headingCount: result.headingCount,
      warnings: result.warnings,
      redirectUrl: `/standards/${result.standard.id}`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "HTML 取込に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
