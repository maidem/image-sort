import { useDb } from "../../../utils/db";
import { requireAdmin } from "../../../utils/auth";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const sql = useDb();
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);

  const [pair] = await sql`SELECT painted_filename FROM image_pairs WHERE id = ${id}`;
  if (!pair) throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });

  if (pair.painted_filename) {
    const p = resolve(uploadPath, pair.painted_filename as string);
    if (existsSync(p)) unlinkSync(p);
    await sql`UPDATE image_pairs SET painted_filename = NULL WHERE id = ${id}`;
  }

  return { ok: true };
});
