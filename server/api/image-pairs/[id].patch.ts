import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ description?: string; painted_at?: string; category_id?: number }>(event);
  const sql = useDb();

  await sql`
    UPDATE image_pairs
    SET
      description = ${body?.description?.trim() || null},
      painted_at  = ${body?.painted_at?.trim() || null},
      category_id = COALESCE(${body?.category_id || null}, category_id)
    WHERE id = ${id}
  `;

  const [result] = await sql`
    SELECT ip.*, c.name AS category_name
    FROM image_pairs ip
    LEFT JOIN categories c ON c.id = ip.category_id
    WHERE ip.id = ${id}
  `;
  return result;
});
