import bcrypt from "bcryptjs";
import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ name?: string; pin?: string; color?: string }>(
    event,
  );
  const db = useDb();
  const existing = db
    .prepare("SELECT * FROM trainers WHERE id = ?")
    .get(id) as any;
  if (!existing) throw createError({ statusCode: 404 });
  const name = body?.name?.trim() ?? existing.name;
  const color = body?.color?.trim() ?? existing.color;

  let pinHash = existing.pin_hash;
  const newPin = body?.pin?.trim();
  if (newPin) {
    if (!/^\d{4,8}$/.test(newPin)) {
      throw createError({
        statusCode: 400,
        statusMessage: "PIN muss 4–8 Ziffern haben",
      });
    }
    pinHash = bcrypt.hashSync(newPin, 10);
  }

  db.prepare(
    "UPDATE trainers SET name = ?, pin_hash = ?, color = ? WHERE id = ?",
  ).run(name, pinHash, color, id);
  const result = db
    .prepare("SELECT id, name, color, created_at FROM trainers WHERE id = ?")
    .get(id);
  broadcastEvent("trainers:updated", result);
  return result;
});
