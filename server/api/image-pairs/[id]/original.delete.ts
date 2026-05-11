import { useDb } from "../../../utils/db";
import { requireAdmin } from "../../../utils/auth";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const db = useDb();
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);

  const pair = db
    .prepare("SELECT original_filename FROM image_pairs WHERE id = ?")
    .get(id) as { original_filename: string | null } | undefined;

  if (!pair) throw createError({ statusCode: 404, statusMessage: "Nicht gefunden" });

  if (pair.original_filename) {
    const p = resolve(uploadPath, pair.original_filename);
    if (existsSync(p)) unlinkSync(p);
    db.prepare("UPDATE image_pairs SET original_filename = NULL WHERE id = ?").run(id);
  }

  return { ok: true };
});
