import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ description?: string; painted_at?: string; category_id?: number }>(event);
  const db = useDb();
  db.prepare(
    `UPDATE image_pairs SET description = ?, painted_at = ?, category_id = COALESCE(?, category_id) WHERE id = ?`,
  ).run(
    body?.description?.trim() || null,
    body?.painted_at?.trim() || null,
    body?.category_id || null,
    id,
  );
  return db
    .prepare(
      `SELECT ip.*, c.name as category_name FROM image_pairs ip LEFT JOIN categories c ON c.id = ip.category_id WHERE ip.id = ?`,
    )
    .get(id);
});
