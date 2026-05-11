import { useDb } from "../../utils/db";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const db = useDb();

  if (query.category_id) {
    return db
      .prepare(
        `SELECT ip.*, c.name as category_name
         FROM image_pairs ip
         LEFT JOIN categories c ON c.id = ip.category_id
         WHERE ip.category_id = ?
         ORDER BY ip.created_at DESC`,
      )
      .all(Number(query.category_id));
  }

  return db
    .prepare(
      `SELECT ip.*, c.name as category_name
       FROM image_pairs ip
       LEFT JOIN categories c ON c.id = ip.category_id
       ORDER BY ip.created_at DESC`,
    )
    .all();
});
