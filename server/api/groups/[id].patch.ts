import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler(async (event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{
    name?: string;
    description?: string;
    trainerIds?: number[];
  }>(event);
  const db = useDb();
  const existing = db
    .prepare("SELECT * FROM groups WHERE id = ?")
    .get(id) as any;
  if (!existing) throw createError({ statusCode: 404 });

  const name = body?.name?.trim() ?? existing.name;
  const description = body?.description?.trim() ?? existing.description;

  const tx = db.transaction(() => {
    db.prepare("UPDATE groups SET name = ?, description = ? WHERE id = ?").run(
      name,
      description,
      id,
    );
    if (Array.isArray(body?.trainerIds)) {
      db.prepare("DELETE FROM group_trainers WHERE group_id = ?").run(id);
      const ins = db.prepare(
        "INSERT OR IGNORE INTO group_trainers (group_id, trainer_id) VALUES (?, ?)",
      );
      for (const tid of body.trainerIds!) ins.run(id, tid);
    }
  });
  tx();
  broadcastEvent("groups:updated", { id, name, description });
  return { ok: true };
});
