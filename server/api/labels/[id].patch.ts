import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ name?: string; description?: string }>(event);
  const db = useDb();
  const existing = db
    .prepare("SELECT * FROM labels WHERE id = ?")
    .get(id) as any;
  if (!existing) throw createError({ statusCode: 404 });

  const name = body?.name?.trim() ?? existing.name;
  const description = body?.description?.trim() ?? existing.description;

  try {
    db.prepare("UPDATE labels SET name = ?, description = ? WHERE id = ?").run(
      name,
      description,
      id,
    );
    const result = db
      .prepare(
        "SELECT id, name, description, created_at FROM labels WHERE id = ?",
      )
      .get(id);
    broadcastEvent("labels:updated", result);
    return result;
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: "Label existiert bereits",
      });
    }
    throw e;
  }
});
