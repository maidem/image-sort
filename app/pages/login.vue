<script setup lang="ts">
const { login, state } = useAuth();
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();
const route = useRoute();

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await login(email.value, password.value);
    const redirect = (route.query.redirect as string) || "/";
    router.push(redirect);
  } catch (e: any) {
    error.value =
      e?.statusMessage || e?.data?.statusMessage || "Login fehlgeschlagen";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="max-w-sm mx-auto mt-16">
    <div class="card space-y-5">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Admin-Login</h1>
      </div>
      <div
        v-if="!state.configured"
        class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3"
      >
        Admin-Zugang ist nicht konfiguriert. Setze
        <span class="kbd">ADMIN_PASSWORD</span> und
        <span class="kbd">SESSION_SECRET</span> in der Umgebung.
      </div>
      <form v-else @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="label">E-Mail</label>
          <input
            v-model="email"
            type="email"
            class="input"
            autofocus
            autocomplete="email"
            :disabled="loading"
          />
        </div>
        <div>
          <label class="label">Passwort</label>
          <input
            v-model="password"
            type="password"
            class="input"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>
        <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
        <button class="btn-lime w-full" :disabled="loading">
          {{ loading ? "…" : "Anmelden" }}
        </button>
      </form>
    </div>
  </section>
</template>
