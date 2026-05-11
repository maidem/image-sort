// Check-in zurücknehmen: Admin (per Session-Cookie) ODER der Trainer selbst (mit PIN).
import bcrypt from "bcryptjs";
import { isAdmin } from "../../../../../utils/auth";
import { rateLimit } from "../../../../../utils/rate-limit";
import { broadcastEvent } from "../../../../../utils/socket";

export default defineEventHandler(async (event) => {
  const slotId = Number(getRouterParam(event, "slotId"));
  const body = await readBody<{ trainer_id?: number; pin?: string }>(event);
  const db = useDb();
  const slot = db
    .prepare("SELECT * FROM slots WHERE id = ?")
    .get(slotId) as any;
  if (!slot) throw createError({ statusCode: 404 });

  let targetTrainerId: number | null = body?.trainer_id || null;

  if (!isAdmin(event)) {
    rateLimit(event, "checkin-undo", 10, 60_000);
    if (!body?.trainer_id || !body?.pin) {
      throw createError({
        statusCode: 400,
        statusMessage: "Trainer und PIN erforderlich",
      });
    }
    const trainer = db
      .prepare("SELECT id, pin_hash FROM trainers WHERE id = ?")
      .get(body.trainer_id) as any;
    const pinOk =
      trainer && bcrypt.compareSync(body.pin, trainer.pin_hash || "");
    if (!trainer || !pinOk) {
      throw createError({ statusCode: 401, statusMessage: "Nicht berechtigt" });
    }
    targetTrainerId = trainer.id;
  }

  if (targetTrainerId) {
    db.prepare(
      "UPDATE slot_trainers SET checked_in_at = NULL WHERE slot_id = ? AND trainer_id = ?",
    ).run(slotId, targetTrainerId);
  } else {
    db.prepare(
      "UPDATE slot_trainers SET checked_in_at = NULL WHERE slot_id = ?",
    ).run(slotId);
  }

  db.prepare(
    `
      UPDATE slots
      SET
        checked_in_at = (
          SELECT MAX(st.checked_in_at)
          FROM slot_trainers st
          WHERE st.slot_id = ?
            AND st.checked_in_at IS NOT NULL
        ),
        trainer_id = (
          SELECT st.trainer_id
          FROM slot_trainers st
          WHERE st.slot_id = ?
            AND st.checked_in_at IS NOT NULL
          ORDER BY st.checked_in_at DESC
          LIMIT 1
        )
      WHERE id = ?
    `,
  ).run(slotId, slotId, slotId);

  const result = db
    .prepare(
      `
    SELECT s.*, g.name AS group_name, l.name AS location_name, t.name AS trainer_name, t.color AS trainer_color
    FROM slots s
    LEFT JOIN groups g ON g.id = s.group_id
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN trainers t ON t.id = s.trainer_id
    WHERE s.id = ?
  `,
    )
    .get(slotId);
  broadcastEvent("checkin:deleted", result);
  return { ok: true };
});
