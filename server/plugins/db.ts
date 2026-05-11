import { runMigrations } from "../utils/db";

export default defineNitroPlugin(async () => {
  await runMigrations();
});
