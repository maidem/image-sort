import { isAdmin } from "../../utils/auth";

export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig();
  return {
    isAdmin: isAdmin(event),
    configured: Boolean(cfg.adminPassword && cfg.sessionSecret),
  };
});
