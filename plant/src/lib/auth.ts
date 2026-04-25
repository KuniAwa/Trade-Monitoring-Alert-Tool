import { timingSafeEqual } from "node:crypto";

export { COOKIE_NAME } from "./authConstants";

export function isPasscodeValid(submitted: string | undefined | null): boolean {
  if (submitted == null || submitted === "") return false;
  const expected = process.env.APP_PASSCODE ?? "";
  if (expected === "") return false;
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getCookieConfig(): { maxAge: number; path: string; httpOnly: boolean; sameSite: "lax" } {
  return {
    maxAge: 60 * 60 * 24 * 400,
    path: "/",
    httpOnly: true,
    sameSite: "lax"
  };
}

export function isSecureInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
