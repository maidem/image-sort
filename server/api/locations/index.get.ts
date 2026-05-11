export default defineEventHandler(() => {
  const db = useDb();
  return db
    .prepare(
      "SELECT id, name, description, created_at FROM locations ORDER BY name",
    )
    .all();
});
