import { useDb } from "../../utils/db";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ name?: string; description?: string }>(event);
  const name = (body?.name || "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name ist erforderlich" });
  }
  const sql = useDb();
  const [row] = await sql`
    INSERT INTO categories (name, description)
    VALUES (${name}, ${body?.description?.trim() || null})
    RETURNING *
  `;
  return row;
});
