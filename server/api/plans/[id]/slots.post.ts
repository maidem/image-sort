import { requireAdmin } from "../../../utils/auth";
import { broadcastEvent } from "../../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const planId = Number(getRouterParam(event, "id"));
  const body = await readBody<{
    date: string;
    start_time: string;
    end_time: string;
    group_id?: number | null;
    location_id?: number | null;
    trainer_id?: number | null;
    trainer_ids?: number[];
    label_ids?: number[];
    note?: string | null;
  }>(event);

  if (!body?.date || !body?.start_time || !body?.end_time) {
    throw createError({
      statusCode: 400,
      statusMessage: "Datum und Uhrzeit erforderlich",
    });
  }

  const db = useDb();
  const plan = db.prepare("SELECT id FROM plans WHERE id = ?").get(planId);
  if (!plan) throw createError({ statusCode: 404 });
  const trainerIds = Array.from(
    new Set(
      [
        ...(Array.isArray(body.trainer_ids) ? body.trainer_ids : []),
        ...(body.trainer_id ? [body.trainer_id] : []),
      ]
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0),
    ),
  );
  const labelIds = Array.from(
    new Set(
      (Array.isArray(body.label_ids) ? body.label_ids : [])
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0),
    ),
  );

  const info = db
    .prepare(
      `
    INSERT INTO slots (plan_id, date, start_time, end_time, group_id, location_id, trainer_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      planId,
      body.date,
      body.start_time,
      body.end_time,
      body.group_id || null,
      body.location_id || null,
      body.trainer_id || null,
      body.note?.trim() || null,
    );
  for (const trainerId of trainerIds) {
    db.prepare(
      "INSERT OR IGNORE INTO slot_trainers (slot_id, trainer_id) VALUES (?, ?)",
    ).run(info.lastInsertRowid, trainerId);
  }
  for (const labelId of labelIds) {
    db.prepare(
      "INSERT OR IGNORE INTO slot_labels (slot_id, label_id) VALUES (?, ?)",
    ).run(info.lastInsertRowid, labelId);
  }

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
    .get(info.lastInsertRowid);
  broadcastEvent("slots:created", result);
  return result;
});
