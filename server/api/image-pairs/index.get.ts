import { useDb } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sql = useDb();

  if (query.category_id) {
    return await sql`
      SELECT ip.*, c.name AS category_name
      FROM image_pairs ip
      LEFT JOIN categories c ON c.id = ip.category_id
      WHERE ip.category_id = ${Number(query.category_id)}
      ORDER BY ip.sort_order ASC, ip.created_at ASC
    `;
  }

  return await sql`
    SELECT ip.*, c.name AS category_name
    FROM image_pairs ip
    LEFT JOIN categories c ON c.id = ip.category_id
    ORDER BY ip.sort_order ASC, ip.created_at ASC
  `;
});
