export default defineEventHandler(() => {
  const db = useDb();
  return db
    .prepare(
      "SELECT id, name, description, created_at FROM labels ORDER BY name",
    )
    .all();
});
