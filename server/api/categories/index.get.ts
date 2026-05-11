import { useDb } from "../../utils/db";

export default defineEventHandler(() => {
  const db = useDb();
  return db
    .prepare(
      `SELECT c.*, COUNT(ip.id) as image_count
       FROM categories c
       LEFT JOIN image_pairs ip ON ip.category_id = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`,
    )
    .all();
});
