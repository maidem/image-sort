import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  useDb().prepare("DELETE FROM plans WHERE id = ?").run(id);
  broadcastEvent("plans:deleted", { id });
  return { ok: true };
});
