import bcrypt from "bcryptjs";
import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ name?: string; pin?: string; color?: string }>(
    event,
  );
  const name = (body?.name || "").trim();
  if (!name)
    throw createError({ statusCode: 400, statusMessage: "Name erforderlich" });
  const pin = (body?.pin || "").trim();
  if (!/^\d{4,8}$/.test(pin)) {
    throw createError({
      statusCode: 400,
      statusMessage: "PIN muss 4–8 Ziffern haben",
    });
  }
  const color = (body?.color || "#a3e635").trim();
  const pinHash = bcrypt.hashSync(pin, 10);
  const db = useDb();
  try {
    const info = db
      .prepare("INSERT INTO trainers (name, pin_hash, color) VALUES (?, ?, ?)")
      .run(name, pinHash, color);
    const result = db
      .prepare("SELECT id, name, color, created_at FROM trainers WHERE id = ?")
      .get(info.lastInsertRowid);
    broadcastEvent("trainers:created", result);
    return result;
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: "Trainer existiert bereits",
      });
    }
    throw e;
  }
});
