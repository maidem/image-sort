import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

interface ReorderItem {
  id: number;
  sort_order: number;
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<ReorderItem[]>(event);
  if (!Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Body muss ein Array von {id, sort_order} Objekten sein",
    });
  }
  for (const item of body) {
    if (typeof item.id !== "number" || typeof item.sort_order !== "number") {
      throw createError({
        statusCode: 400,
        statusMessage: "Jedes Item muss id und sort_order haben",
      });
    }
  }
  const sql = useDb();
  await sql.begin(async (sql) => {
    for (const item of body) {
      await sql`UPDATE image_pairs SET sort_order = ${item.sort_order} WHERE id = ${item.id}`;
    }
  });
  return { ok: true };
});
