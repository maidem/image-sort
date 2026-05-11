import { requireAdmin } from "../../../../utils/auth";
import { broadcastEvent } from "../../../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const slotId = Number(getRouterParam(event, "slotId"));
  const body = (await readBody<any>(event)) || {};
  const db = useDb();
  const existing = db
    .prepare("SELECT * FROM slots WHERE id = ?")
    .get(slotId) as any;
  if (!existing) throw createError({ statusCode: 404 });

  const fields = [
    "date",
    "start_time",
    "end_time",
    "group_id",
    "location_id",
    "note",
  ];
  const updates: string[] = [];
  const values: any[] = [];
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`);
      values.push(body[f] === "" ? null : body[f]);
    }
  }
  if ("trainer_id" in body) {
    updates.push("trainer_id = ?");
    values.push(body.trainer_id === "" ? null : body.trainer_id);
  }
  const hasTrainerIds = Array.isArray(body?.trainer_ids);
  const hasLabelIds = Array.isArray(body?.label_ids);
  if (updates.length === 0 && !hasTrainerIds && !hasLabelIds) return existing;

  if (updates.length) {
    values.push(slotId);
    db.prepare(`UPDATE slots SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }
  if (hasTrainerIds) {
    const trainerIds = Array.from(
      new Set(
        body.trainer_ids
          .map((v: any) => Number(v))
          .filter((v: number) => Number.isInteger(v) && v > 0),
      ),
    );
    db.prepare("DELETE FROM slot_trainers WHERE slot_id = ?").run(slotId);
    for (const trainerId of trainerIds) {
      db.prepare(
        "INSERT OR IGNORE INTO slot_trainers (slot_id, trainer_id) VALUES (?, ?)",
      ).run(slotId, trainerId);
    }
  }
  if (hasLabelIds) {
    const labelIds = Array.from(
      new Set(
        body.label_ids
          .map((v: any) => Number(v))
          .filter((v: number) => Number.isInteger(v) && v > 0),
      ),
    );
    db.prepare("DELETE FROM slot_labels WHERE slot_id = ?").run(slotId);
    for (const labelId of labelIds) {
      db.prepare(
        "INSERT OR IGNORE INTO slot_labels (slot_id, label_id) VALUES (?, ?)",
      ).run(slotId, labelId);
    }
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
    .get(slotId);
  broadcastEvent("slots:updated", result);
  return result;
});
