/**
 * Prisma CLI は .env.local を読まない。Next.js と同じ階層の .env / .env.local から
 * DATABASE_URL 等を取り込んでから Prisma を実行する。
 */
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
try {
  require("dotenv").config({ path: path.join(root, ".env") });
  require("dotenv").config({ path: path.join(root, ".env.local"), override: true });
} catch {
  // dotenv 未インストール時は OS / CI の process.env のみ
}

const args = process.argv.slice(2);
if (args.length === 0) {
  // eslint-disable-next-line no-console
  console.error("使い方: node scripts/prisma-with-env.cjs <prisma サブコマンド> [...]");
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", ...args], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env
});
process.exit(r.status === null ? 1 : r.status);
