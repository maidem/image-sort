import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ name?: string; description?: string }>(event);
  const name = (body?.name || "").trim();
  if (!name)
    throw createError({ statusCode: 400, statusMessage: "Name erforderlich" });
  const description = body?.description?.trim() || null;
  const db = useDb();
  try {
    const info = db
      .prepare("INSERT INTO groups (name, description) VALUES (?, ?)")
      .run(name, description);
    const result = db
      .prepare("SELECT id, name, description FROM groups WHERE id = ?")
      .get(info.lastInsertRowid);
    broadcastEvent("groups:created", result);
    return result;
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: "Gruppe existiert bereits",
      });
    }
    throw e;
  }
});
