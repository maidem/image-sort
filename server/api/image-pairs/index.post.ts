import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);
  mkdirSync(uploadPath, { recursive: true });

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: "Keine Formulardaten" });
  }

  const get = (name: string) =>
    parts.find((p) => p.name === name)?.data?.toString("utf8").trim() ?? "";

  const category_id = Number(get("category_id"));
  if (!category_id) {
    throw createError({ statusCode: 400, statusMessage: "category_id fehlt" });
  }

  const description = get("description") || null;
  const painted_at = get("painted_at") || null;

  function saveFile(name: string): string | null {
    const part = parts!.find((p) => p.name === name);
    if (!part || !part.data?.length) return null;
    const mime = part.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(mime)) {
      throw createError({ statusCode: 400, statusMessage: `Ungültiger Dateityp: ${mime}` });
    }
    const ext = extname(part.filename || `.${mime.split("/")[1]}`);
    const filename = `${randomUUID()}${ext}`;
    writeFileSync(resolve(uploadPath, filename), part.data);
    return filename;
  }

  const original_filename = saveFile("original");
  const painted_filename = saveFile("painted");

  const db = useDb();
  const result = db
    .prepare(
      `INSERT INTO image_pairs (category_id, original_filename, painted_filename, description, painted_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(category_id, original_filename, painted_filename, description, painted_at);

  return db
    .prepare(
      `SELECT ip.*, c.name as category_name
       FROM image_pairs ip
       LEFT JOIN categories c ON c.id = ip.category_id
       WHERE ip.id = ?`,
    )
    .get(result.lastInsertRowid);
});
