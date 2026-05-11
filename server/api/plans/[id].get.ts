export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, "id"));
  const db = useDb();
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(id) as any;
  if (!plan) throw createError({ statusCode: 404 });
  const slots = db
    .prepare(
      `
    SELECT s.*, g.name AS group_name, l.name AS location_name, t.name AS trainer_name, t.color AS trainer_color
    FROM slots s
    LEFT JOIN groups g ON g.id = s.group_id
    LEFT JOIN locations l ON l.id = s.location_id
    LEFT JOIN trainers t ON t.id = s.trainer_id
    WHERE s.plan_id = ?
    ORDER BY s.date, s.start_time
  `,
    )
    .all(id);
  if (slots.length) {
    const slotIds = slots.map((s: any) => s.id);
    const placeholders = slotIds.map(() => "?").join(", ");
    const slotTrainers = db
      .prepare(
        `
      SELECT st.slot_id, st.checked_in_at, t.id, t.name, t.color
      FROM slot_trainers st
      JOIN trainers t ON t.id = st.trainer_id
      WHERE st.slot_id IN (${placeholders})
      ORDER BY t.name
    `,
      )
      .all(...slotIds) as any[];
    const trainersBySlot = new Map<number, any[]>();
    for (const st of slotTrainers) {
      if (!trainersBySlot.has(st.slot_id)) trainersBySlot.set(st.slot_id, []);
      trainersBySlot.get(st.slot_id)!.push({
        id: st.id,
        name: st.name,
        color: st.color,
        checked_in_at: st.checked_in_at,
      });
    }
    const slotLabels = db
      .prepare(
        `
      SELECT sl.slot_id, l.id, l.name, l.description
      FROM slot_labels sl
      JOIN labels l ON l.id = sl.label_id
      WHERE sl.slot_id IN (${placeholders})
      ORDER BY l.name
    `,
      )
      .all(...slotIds) as any[];
    const labelsBySlot = new Map<number, any[]>();
    for (const sl of slotLabels) {
      if (!labelsBySlot.has(sl.slot_id)) labelsBySlot.set(sl.slot_id, []);
      labelsBySlot.get(sl.slot_id)!.push({
        id: sl.id,
        name: sl.name,
        description: sl.description,
      });
    }
    for (const slot of slots as any[]) {
      slot.trainers = trainersBySlot.get(slot.id) || [];
      slot.labels = labelsBySlot.get(slot.id) || [];
    }
  }
  return { ...plan, slots };
});
