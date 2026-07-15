import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { desc, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import { API_PREFIX, MAX_UPLOAD_BYTES } from "@falcon/config";
import { mediaAssets } from "@falcon/database";
import { uuidSchema } from "@falcon/validation";
import { requirePermission } from "../plugins/auth.js";
import { writeAudit } from "../lib/audit.js";
import { badRequest, notFound } from "../lib/errors.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export async function registerAdminMediaRoutes(app: FastifyInstance): Promise<void> {
  const mediaDir = path.resolve(app.env.MEDIA_DIR);
  await mkdir(mediaDir, { recursive: true });

  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
  });
  await app.register(fastifyStatic, {
    root: mediaDir,
    prefix: "/media/",
    decorateReply: false,
    maxAge: "365d",
    immutable: true,
  });

  const P = `${API_PREFIX}/admin/media`;

  app.get(P, { preHandler: requirePermission("media.write") }, async () => ({
    assets: await app.db
      .select()
      .from(mediaAssets)
      .where(isNull(mediaAssets.deletedAt))
      .orderBy(desc(mediaAssets.createdAt))
      .limit(200),
  }));

  app.post(P, { preHandler: requirePermission("media.write") }, async (req, reply) => {
    const file = await req.file();
    if (!file) throw badRequest("أرفق ملف صورة.");
    const ext = path.extname(file.filename || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw badRequest("امتداد الملف غير مدعوم. المسموح: JPG, PNG, WEBP, AVIF.");
    }
    const buffer = await file.toBuffer();
    const sniffed = await fileTypeFromBuffer(buffer);
    if (!sniffed || !ALLOWED_MIME.has(sniffed.mime)) {
      throw badRequest("محتوى الملف ليس صورة صالحة.");
    }

    /* إعادة الترميز عبر sharp: يزيل بيانات EXIF ويوحّد الصيغة ويضبط الأبعاد */
    let processed: Buffer;
    let width: number | undefined;
    let height: number | undefined;
    try {
      const pipeline = sharp(buffer, { limitInputPixels: 30_000_000 })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 });
      processed = await pipeline.toBuffer();
      const meta = await sharp(processed).metadata();
      width = meta.width;
      height = meta.height;
    } catch {
      throw badRequest("تعذرت معالجة الصورة. جرّب ملفًا آخر.");
    }

    const fileName = `${randomUUID()}.webp`;
    await writeFile(path.join(mediaDir, fileName), processed);
    const url = `/media/${fileName}`;
    const [created] = await app.db
      .insert(mediaAssets)
      .values({
        fileName,
        url,
        mime: "image/webp",
        sizeBytes: processed.byteLength,
        width: width ?? null,
        height: height ?? null,
        alt: null,
        createdBy: req.authUser!.id,
      })
      .returning();
    await writeAudit(app.db, req, { action: "media.uploaded", entity: "media", entityId: created!.id, meta: { fileName, sizeBytes: processed.byteLength } });
    return reply.status(201).send({ asset: created });
  });

  app.delete(P + "/:id", { preHandler: requirePermission("media.write") }, async (req) => {
    const id = uuidSchema.parse((req.params as { id: string }).id);
    const [row] = await app.db
      .update(mediaAssets)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAssets.id, id))
      .returning({ fileName: mediaAssets.fileName });
    if (!row) throw notFound("الملف غير موجود.");
    await unlink(path.join(mediaDir, row.fileName)).catch(() => undefined);
    await writeAudit(app.db, req, { action: "media.deleted", entity: "media", entityId: id });
    return { ok: true };
  });
}
