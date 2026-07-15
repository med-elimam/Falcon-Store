/**
 * TOTP (RFC 6238) و HOTP (RFC 4226) — تنفيذ خادم فقط عبر node:crypto.
 * لا يُستورد هذا الملف أبدًا من كود المتصفح.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secretB32: string, counter: number, digits = 6): string {
  const key = Buffer.from(base32Decode(secretB32));
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = (digest[digest.length - 1] as number) & 0x0f;
  const code =
    (((digest[offset] as number) & 0x7f) << 24) |
    ((digest[offset + 1] as number) << 16) |
    ((digest[offset + 2] as number) << 8) |
    (digest[offset + 3] as number);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function totpCode(secretB32: string, timestampMs = Date.now(), stepSeconds = 30): string {
  return hotp(secretB32, Math.floor(timestampMs / 1000 / stepSeconds));
}

/** يتحقق مع سماحية ±1 خطوة زمنية لمعالجة انحراف الساعة. */
export function verifyTotp(secretB32: string, code: string, timestampMs = Date.now()): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(timestampMs / 1000 / 30);
  for (const drift of [-1, 0, 1]) {
    const expected = hotp(secretB32, counter + drift);
    const a = Buffer.from(expected);
    const b = Buffer.from(normalized);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function otpauthUrl(secretB32: string, accountName: string, issuer: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
