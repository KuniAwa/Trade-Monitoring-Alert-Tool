import assert from "node:assert/strict";

import {
  buildBackgroundReferencePromptBlock,
  buildStandardsPromptBlock
} from "../src/lib/jgaapCaseContext";

const standards = [
  {
    standard: {
      id: "s1",
      standardId: "ASBJ 34",
      titleJa: "リースに関する会計基準",
      documentKind: "STANDARD",
      paragraphs: [
        {
          paragraphId: "1",
          quoteJa: "本文",
          kind: "BODY",
          obligationLevel: "MUST",
          sectionPathJa: "目的"
        },
        {
          paragraphId: "BC1",
          quoteJa: "結論の背景の説明文です。",
          kind: "BACKGROUND",
          obligationLevel: "EXPLANATORY",
          sectionPathJa: "結論の背景"
        },
        {
          paragraphId: "[設例1]",
          quoteJa: "設例は対象外",
          kind: "EXAMPLE",
          obligationLevel: "EXPLANATORY",
          sectionPathJa: "設例"
        }
      ]
    }
  }
];

const normative = buildStandardsPromptBlock(standards as never);
assert.ok(normative.includes("第1項"));
assert.equal(normative.includes("BC1"), false);
assert.equal(normative.includes("設例は対象外"), false);
assert.ok(normative.includes("設例 1 項は対象外"));

const background = buildBackgroundReferencePromptBlock(standards as never);
assert.ok(background.includes("ASBJ 34 第BC1項"));
assert.ok(background.includes("結論の背景の説明文です。"));
assert.equal(background.includes("[設例1]"), false);
assert.equal(background.includes("設例は対象外"), false);

console.log("ok");
