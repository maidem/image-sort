export default defineEventHandler(() => {
  const db = useDb();
  const groups = db
    .prepare("SELECT id, name, description FROM groups ORDER BY name")
    .all() as any[];
  const trainersByGroup = db
    .prepare(
      `
    SELECT gt.group_id, t.id, t.name, t.color
    FROM group_trainers gt
    JOIN trainers t ON t.id = gt.trainer_id
  `,
    )
    .all() as any[];
  const map = new Map<number, any[]>();
  for (const row of trainersByGroup) {
    if (!map.has(row.group_id)) map.set(row.group_id, []);
    map
      .get(row.group_id)!
      .push({ id: row.id, name: row.name, color: row.color });
  }
  return groups.map((g) => ({ ...g, trainers: map.get(g.id) || [] }));
});
