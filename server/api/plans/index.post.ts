import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const body = await readBody<{ year: number; month: number; title?: string }>(
    event,
  );
  const year = Number(body?.year);
  const month = Number(body?.month);
  if (!year || !month || month < 1 || month > 12) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ungültiger Zeitraum",
    });
  }
  const title = body?.title?.trim() || null;
  const db = useDb();
  try {
    const info = db
      .prepare("INSERT INTO plans (year, month, title) VALUES (?, ?, ?)")
      .run(year, month, title);
    const result = db
      .prepare("SELECT * FROM plans WHERE id = ?")
      .get(info.lastInsertRowid);
    broadcastEvent("plans:created", result);
    return result;
  } catch (e: any) {
    if (String(e?.message).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: "Plan für diesen Monat existiert bereits",
      });
    }
    throw e;
  }
});
