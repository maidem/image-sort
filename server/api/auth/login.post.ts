import { safeEqual, setAdminSession } from "../../utils/auth";
import { rateLimit } from "../../utils/rate-limit";

export default defineEventHandler(async (event) => {
  rateLimit(event, "admin-login", 8, 60_000);

  const cfg = useRuntimeConfig();
  if (!cfg.adminPassword || !cfg.sessionSecret) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Admin-Login nicht konfiguriert (ADMIN_PASSWORD / SESSION_SECRET fehlen).",
    });
  }

  const body = await readBody<{ email?: string; password?: string }>(event);
  const email = (body?.email || "").trim().toLowerCase();
  const pw = (body?.password || "").trim();

  const emailOk = cfg.adminEmail
    ? safeEqual(email, (cfg.adminEmail as string).toLowerCase())
    : true;

  if (!pw || !emailOk || !safeEqual(pw, cfg.adminPassword as string)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Falsche Zugangsdaten",
    });
  }
  setAdminSession(event);
  return { ok: true };
});
