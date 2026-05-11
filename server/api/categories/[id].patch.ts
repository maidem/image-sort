import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ name?: string; description?: string }>(event);
  const name = (body?.name || "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name ist erforderlich" });
  }
  const db = useDb();
  db.prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?")
    .run(name, body?.description?.trim() || null, id);
  return db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
});
