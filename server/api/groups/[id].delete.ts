import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  useDb().prepare("DELETE FROM groups WHERE id = ?").run(id);
  broadcastEvent("groups:deleted", { id });
  return { ok: true };
});
