export default defineEventHandler(() => {
  const db = useDb();
  return db
    .prepare("SELECT id, name, color, created_at FROM trainers ORDER BY name")
    .all();
});
