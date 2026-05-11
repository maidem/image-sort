import { requireAdmin } from "../../utils/auth";
import { broadcastEvent } from "../../utils/socket";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const id = Number(getRouterParam(event, "id"));
  useDb().prepare("DELETE FROM locations WHERE id = ?").run(id);
  broadcastEvent("locations:deleted", { id });
  return { ok: true };
});
