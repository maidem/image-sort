export default defineEventHandler(() => {
  const db = useDb();
  return db
    .prepare(
      `
    SELECT p.id, p.year, p.month, p.title, p.created_at,
      (SELECT COUNT(*) FROM slots s WHERE s.plan_id = p.id) AS slot_count,
      (SELECT COUNT(*) FROM slots s WHERE s.plan_id = p.id AND s.checked_in_at IS NOT NULL) AS checked_in_count
    FROM plans p
    ORDER BY p.year DESC, p.month DESC
  `,
    )
    .all();
});
