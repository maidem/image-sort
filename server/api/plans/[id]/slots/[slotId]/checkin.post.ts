// Trainer-Check-in: Trainer authentisiert sich via Name + PIN, dann wird der Slot
// dem Trainer zugewiesen (falls nicht bereits) und checked_in_at gesetzt.
import bcrypt from "bcryptjs";
import { rateLimit } from "../../../../../utils/rate-limit";
import { broadcastEvent } from "../../../../../utils/socket";

export default defineEventHandler(async (event) => {
  rateLimit(event, "checkin", 10, 60_000);

  const slotId = Number(getRouterParam(event, "slotId"));
  const body = await readBody<{ trainer_id?: number; pin?: string }>(event);
  if (!body?.trainer_id || !body?.pin) {
    throw createError({
      statusCode: 400,
      statusMessage: "Trainer und PIN erforderlich",
    });
  }
  const db = useDb();
  const trainer = db
    .prepare("SELECT id, pin_hash FROM trainers WHERE id = ?")
    .get(body.trainer_id) as any;
  const pinOk = trainer && bcrypt.compareSync(body.pin, trainer.pin_hash || "");
  if (!trainer || !pinOk) {
    throw createError({ statusCode: 401, statusMessage: "PIN falsch" });
  }
  const slot = db
    .prepare("SELECT * FROM slots WHERE id = ?")
    .get(slotId) as any;
  if (!slot) throw createError({ statusCode: 404 });
  const assigned = db
    .prepare("SELECT trainer_id FROM slot_trainers WHERE slot_id = ?")
    .all(slotId) as { trainer_id: number }[];
  const assignedIds = assigned.map((a) => a.trainer_id);

  if (!assignedIds.length) {
    db.prepare(
      "INSERT OR IGNORE INTO slot_trainers (slot_id, trainer_id, checked_in_at) VALUES (?, ?, datetime('now'))",
    ).run(slotId, trainer.id);
  } else if (!assignedIds.includes(trainer.id)) {
    throw createError({
      statusCode: 409,
      statusMessage: "Trainer ist diesem Slot nicht zugewiesen",
    });
  } else {
    db.prepare(
      "UPDATE slot_trainers SET checked_in_at = datetime('now') WHERE slot_id = ? AND trainer_id = ?",
    ).run(slotId, trainer.id);
  }

  db.prepare(
    `
      UPDATE slots
      SET
        trainer_id = ?,
        checked_in_at = (
          SELECT MAX(st.checked_in_at)
          FROM slot_trainers st
          WHERE st.slot_id = ?
            AND st.checked_in_at IS NOT NULL
        )
      WHERE id = ?
    `,
  ).run(trainer.id, slotId, slotId);

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
  broadcastEvent("checkin:created", result);
  return result;
});
