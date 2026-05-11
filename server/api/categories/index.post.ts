import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ name?: string; description?: string }>(event);
  const name = (body?.name || "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name ist erforderlich" });
  }
  const db = useDb();
  const result = db
    .prepare("INSERT INTO categories (name, description) VALUES (?, ?)")
    .run(name, body?.description?.trim() || null);
  return db
    .prepare("SELECT * FROM categories WHERE id = ?")
    .get(result.lastInsertRowid);
});
