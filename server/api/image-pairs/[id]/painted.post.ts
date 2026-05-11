import { useDb } from "../../../utils/db";
import { requireAdmin } from "../../../utils/auth";
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);
  mkdirSync(uploadPath, { recursive: true });

  const sql = useDb();
  const [pair] =
    await sql`SELECT id, painted_filename FROM image_pairs WHERE id = ${id}`;
  if (!pair)
    throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });

  const parts = await readMultipartFormData(event);
  if (!parts)
    throw createError({
      statusCode: 400,
      statusMessage: "Keine Formulardaten",
    });

  const part = parts.find((p) => p.name === "painted");
  if (!part || !part.data?.length)
    throw createError({ statusCode: 400, statusMessage: "Keine Datei" });

  const mime = part.type || "application/octet-stream";
  if (!ALLOWED_TYPES.includes(mime)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Ungültiger Dateityp: ${mime}`,
    });
  }

  if (pair.painted_filename) {
    const oldPath = resolve(uploadPath, pair.painted_filename as string);
    if (existsSync(oldPath)) unlinkSync(oldPath);
  }

  const ext = extname(part.filename || `.${mime.split("/")[1]}`);
  const filename = `${randomUUID()}${ext}`;
  writeFileSync(resolve(uploadPath, filename), part.data);

  await sql`UPDATE image_pairs SET painted_filename = ${filename} WHERE id = ${id}`;
  return { ok: true, filename };
});
