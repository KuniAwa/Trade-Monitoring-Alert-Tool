const enc = new TextEncoder();

function toHex(u8: Uint8Array): string {
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * HMAC-SHA256(secret, message) の 16 進小文字。Edge / Node 両方で同じ。
 */
export async function hmacToken(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(new Uint8Array(sig));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return d === 0;
}
