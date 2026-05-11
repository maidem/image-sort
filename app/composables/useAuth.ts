interface AuthState {
  isAdmin: boolean;
  configured: boolean;
}

export function useAuth() {
  const state = useState<AuthState>("auth", () => ({
    isAdmin: false,
    configured: true,
  }));

  async function refresh() {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(["cookie"])
        : undefined;
      const me = await $fetch<AuthState>("/api/auth/me", { headers });
      state.value = me;
    } catch {
      state.value = { isAdmin: false, configured: true };
    }
  }

  async function login(email: string, password: string) {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await refresh();
  }

  async function logout() {
    await $fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }

  return { state: readonly(state), refresh, login, logout };
}
