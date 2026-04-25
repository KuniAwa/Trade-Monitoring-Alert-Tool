import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/authConstants";
import { isPasscodeValid, getCookieConfig, isSecureInProduction } from "@/lib/auth";
import { hmacToken } from "@/lib/hmacToken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.AUTH_SECRET;
  const pass = process.env.APP_PASSCODE;
  if (!secret || !pass) {
    return NextResponse.json(
      { error: "サーバー未設定: AUTH_SECRET と APP_PASSCODE を .env.local に設定してください。" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { passcode?: string };
  if (!isPasscodeValid(body.passcode)) {
    return NextResponse.json({ error: "パスワードが違います。" }, { status: 401 });
  }

  const token = await hmacToken(secret, `plant:${pass}`);
  const res = NextResponse.json({ ok: true });
  const { maxAge, path, httpOnly, sameSite } = getCookieConfig();
  res.cookies.set(COOKIE_NAME, token, {
    maxAge,
    path,
    httpOnly,
    sameSite,
    secure: isSecureInProduction()
  });
  return res;
}
