import { asc, eq } from "drizzle-orm";
import type { PublicSettingsDTO } from "@falcon/shared";
import { deliveryZones, paymentMethods, siteSettings, type AnyDb } from "@falcon/database";
import { SETTINGS_SCHEMAS, type SettingsGroup } from "@falcon/validation";

const EMPTY_DEFAULTS: Record<SettingsGroup, Record<string, unknown>> = {
  identity: { nameAr: null, nameLatin: null, description: null, logoUrl: null },
  contact: { whatsapp: null, phone: null, email: null, address: null, mapUrl: null },
  commerce: { currencyDisplay: "mru", pickupAvailable: false, codNote: null },
  policies: { authenticity: null, returns: null, privacy: null, terms: null },
  social: { instagram: null, facebook: null, tiktok: null, other: null },
  operations: { orderNotifyWhatsapp: null, defaultStockBehavior: "deduct", lowStockThreshold: 3, hoursAr: null },
  appearance: { defaultTheme: "light" },
};

export async function getSettingsGroup<G extends SettingsGroup>(
  db: AnyDb,
  group: G
): Promise<Record<string, unknown>> {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, group)).limit(1);
  const stored = (rows[0]?.value as Record<string, unknown>) ?? {};
  return { ...EMPTY_DEFAULTS[group], ...stored };
}

export async function getAllSettings(db: AnyDb): Promise<Record<SettingsGroup, Record<string, unknown>>> {
  const rows = await db.select().from(siteSettings);
  const out = {} as Record<SettingsGroup, Record<string, unknown>>;
  for (const group of Object.keys(EMPTY_DEFAULTS) as SettingsGroup[]) {
    const stored = (rows.find((r) => r.key === group)?.value as Record<string, unknown>) ?? {};
    out[group] = { ...EMPTY_DEFAULTS[group], ...stored };
  }
  return out;
}

export async function saveSettingsGroup(
  db: AnyDb,
  group: SettingsGroup,
  value: Record<string, unknown>,
  updatedBy: string | null
): Promise<Record<string, unknown>> {
  const schema = SETTINGS_SCHEMAS[group];
  const parsed = schema.parse(value);
  await db
    .insert(siteSettings)
    .values({ key: group, value: parsed, updatedBy })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed, updatedBy, updatedAt: new Date() },
    });
  invalidatePublicSettingsCache();
  return parsed as Record<string, unknown>;
}

/* كاش خفيف داخل العملية للإعدادات العامة (60 ثانية) */
let cache: { at: number; value: PublicSettingsDTO } | null = null;
export function invalidatePublicSettingsCache(): void {
  cache = null;
}

export async function getPublicSettings(db: AnyDb): Promise<PublicSettingsDTO> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const all = await getAllSettings(db);
  const pm = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.enabled, true))
    .orderBy(asc(paymentMethods.sortOrder));
  const zones = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.enabled, true))
    .orderBy(asc(deliveryZones.sortOrder));

  const contact = all.contact as PublicSettingsDTO["contact"];
  const value: PublicSettingsDTO = {
    identity: all.identity as PublicSettingsDTO["identity"],
    appearance: all.appearance as PublicSettingsDTO["appearance"],
    contact,
    commerce: all.commerce as PublicSettingsDTO["commerce"],
    policies: all.policies as PublicSettingsDTO["policies"],
    social: all.social as PublicSettingsDTO["social"],
    operations: { hoursAr: (all.operations as { hoursAr: string | null }).hoursAr },
    checkoutReady: pm.length > 0 && zones.length > 0,
    paymentMethods: pm.map((m) => ({ id: m.id, key: m.key, labelAr: m.labelAr, instructionsAr: m.instructionsAr })),
    deliveryZones: zones.map((z) => ({ id: z.id, nameAr: z.nameAr, feeMru: z.feeMru, etaAr: z.etaAr })),
  };
  cache = { at: Date.now(), value };
  return value;
}
