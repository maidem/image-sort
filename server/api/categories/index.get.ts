import { useDb } from "../../utils/db";

export default defineEventHandler(async () => {
  const sql = useDb();
  return await sql`
    SELECT c.*, CAST(COUNT(ip.id) AS INTEGER) AS image_count
    FROM categories c
    LEFT JOIN image_pairs ip ON ip.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `;
});
