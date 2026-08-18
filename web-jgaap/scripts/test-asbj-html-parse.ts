import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseAsbjHtml } from "../src/lib/asbjHtmlParse";

const files = [
  "収益認識に関する会計基準.html",
  "収益認識に関する会計基準の適用指針.html",
  "新リースに関する会計基準.html",
  "新リースに関する会計基準の適用指針.html"
];

const sampleDir = resolve(process.cwd(), "..", "sample");

for (const name of files) {
  const html = readFileSync(resolve(sampleDir, name), "utf8");
  const parsed = parseAsbjHtml(html);
  const kinds = parsed.paragraphs.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log("====", name);
  console.log("standardId:", parsed.standardId);
  console.log("titleJa:", parsed.titleJa);
  console.log("documentNumberJa:", parsed.documentNumberJa);
  console.log("documentKind:", parsed.documentKind);
  console.log("headings:", parsed.headings.length);
  console.log("paragraphs:", parsed.paragraphs.length);
  console.log("kinds:", kinds);
  console.log("first:", parsed.paragraphs[0]?.paragraphId, parsed.paragraphs[0]?.quoteJa.slice(0, 80));
  console.log(
    "last:",
    parsed.paragraphs.at(-1)?.paragraphId,
    parsed.paragraphs.at(-1)?.quoteJa.slice(0, 80)
  );
  console.log("warnings:", parsed.warnings);
  console.log("sample headings:", parsed.headings.slice(0, 8).map((h) => `${h.level}:${h.titleJa}`));
}
