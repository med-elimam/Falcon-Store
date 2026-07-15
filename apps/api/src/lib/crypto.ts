import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/** إعدادات Argon2id وفق توصيات OWASP (m=19MiB, t=2, p=1). */
const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, ARGON_OPTS);
}

export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return argonVerify(hashed, plain).catch(() => false);
}

/** تجزئة وهمية ثابتة لموازنة التوقيت عند عدم وجود الحساب. */
export const DUMMY_HASH_PROMISE = hashPassword(randomBytes(16).toString("hex"));

export function newSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** رموز استرداد بصيغة XXXX-XXXX-XX سهلة النسخ. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`;
  });
}
