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
  const sql = useDb();
  const [row] = await sql`
    UPDATE categories
    SET name = ${name}, description = ${body?.description?.trim() || null}
    WHERE id = ${id}
    RETURNING *
  `;
  return row;
});
