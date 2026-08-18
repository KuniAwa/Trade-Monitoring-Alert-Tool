import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ingestAsbjHtml } from "../src/lib/jgaapIngest";

async function main() {
  const dir = resolve(process.cwd(), "..", "sample");
  const files = [
    "収益認識に関する会計基準.html",
    "収益認識に関する会計基準の適用指針.html"
  ];

  for (const name of files) {
    const html = readFileSync(resolve(dir, name), "utf8");
    const result = await ingestAsbjHtml({ html });
    console.log(
      result.standard.standardId,
      result.standard.titleJa,
      "項数",
      result.standard.paragraphCount,
      "warnings",
      result.warnings.length
    );
  }
}

void main();
