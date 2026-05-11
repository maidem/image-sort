import { useAuth } from "~/composables/useAuth";

export default defineNuxtPlugin(async () => {
  const { refresh } = useAuth();
  await refresh();
});
