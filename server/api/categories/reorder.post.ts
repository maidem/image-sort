import { useDb } from "../../utils/db";

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

  const db = useDb();
  const stmt = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?");

  for (const item of body) {
    if (typeof item.id !== "number" || typeof item.sort_order !== "number") {
      throw createError({
        statusCode: 400,
        statusMessage: "Jedes Item muss id und sort_order haben",
      });
    }
    stmt.run(item.sort_order, item.id);
  }

  return { ok: true };
});
