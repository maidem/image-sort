import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const sql = useDb();
  const cfg = useRuntimeConfig();
  const uploadPath = resolve(cfg.uploadPath as string);

  const pairs = await sql`
    SELECT original_filename, painted_filename FROM image_pairs WHERE category_id = ${id}
  `;

  for (const pair of pairs) {
    for (const fn of [pair.original_filename, pair.painted_filename]) {
      if (fn) {
        const p = resolve(uploadPath, fn);
        if (existsSync(p)) unlinkSync(p);
      }
    }
  }

  await sql`DELETE FROM categories WHERE id = ${id}`;
  return { ok: true };
});
