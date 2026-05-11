import { requireAdmin } from "../../../../utils/auth";
import { broadcastEvent } from "../../../../utils/socket";

export default defineEventHandler((event) => {
  requireAdmin(event);
  const slotId = Number(getRouterParam(event, "slotId"));
  useDb().prepare("DELETE FROM slots WHERE id = ?").run(slotId);
  broadcastEvent("slots:deleted", { id: slotId });
  return { ok: true };
});
