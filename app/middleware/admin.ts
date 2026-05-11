export default defineNuxtRouteMiddleware((to) => {
  const { state } = useAuth();
  if (!state.value.isAdmin) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }
});
