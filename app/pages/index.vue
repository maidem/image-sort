<script setup lang="ts">
const { data: plans, refresh } = await useFetch<any[]>("/api/plans");
const plansRef = ref(plans || []);

// Auto-sync with live updates and fallback refreshes
useSyncData(plansRef, "plans", "id", refresh);

const { state: auth } = useAuth();

const showCreate = ref(false);
const now = new Date();
const form = reactive({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  title: "",
});
const error = ref("");
const deleteModal = ref<any>(null);

const monthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

async function createPlan() {
  error.value = "";
  try {
    await $fetch("/api/plans", { method: "POST", body: { ...form } });
    showCreate.value = false;
    form.title = "";
    // New plan will be added via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler beim Anlegen";
  }
}

async function deletePlan() {
  try {
    const plan = deleteModal.value;
    await $fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    deleteModal.value = null;
    // Deletion will come via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler beim Löschen";
  }
}
</script>

<template>
  <section class="space-y-8">
    <div class="flex items-end justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-ink-900">
          Belegungspläne
        </h1>
        <p class="text-ink-500 mt-1">
          <template v-if="auth.isLoggedIn">
            Übersicht über alle Monatspläne. Klicke einen Plan an, um Slots zu
            verwalten.
          </template>
          <template v-else>
            Übersicht über alle Monatspläne. Klicke einen Plan an.
          </template>
        </p>
      </div>
      <button
        v-if="auth.isAdmin"
        class="btn-lime w-full sm:w-auto"
        @click="showCreate = true"
      >
        + Neuer Plan
      </button>
    </div>

    <div
      v-if="plansRef?.length"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="p in plansRef"
        :key="p.id"
        class="card hover:border-ink-900 transition-all group"
      >
        <NuxtLink :to="`/plans/${p.id}`" class="block">
          <div class="flex items-start justify-between">
            <div>
              <div class="text-xs uppercase tracking-wider text-ink-500">
                {{ p.year }}
              </div>
              <div class="text-2xl font-semibold mt-0.5">
                {{ monthNames[p.month - 1] }}
              </div>
              <div v-if="p.title" class="text-sm text-ink-600 mt-1 truncate">
                {{ p.title }}
              </div>
            </div>
          </div>
          <div class="divider my-4"></div>
          <div class="flex items-center justify-between text-xs text-ink-500">
            <span>{{ p.slot_count }} Slots</span>
            <span class="text-ink-400">öffnen →</span>
          </div>
        </NuxtLink>
        <div
          v-if="auth.isAdmin"
          class="flex gap-2 mt-4 pt-3 border-t border-ink-100"
        >
          <button
            class="btn-danger text-xs flex-1"
            @click.stop="deleteModal = p"
          >
            ✕ Löschen
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card text-center py-16">
      <div class="text-ink-500 mb-4">Noch keine Pläne angelegt.</div>
      <button v-if="auth.isAdmin" class="btn-lime" @click="showCreate = true">
        Ersten Plan anlegen
      </button>
      <NuxtLink v-else to="/login" class="btn-ghost text-xs"
        >Als Admin anmelden</NuxtLink
      >
    </div>

    <!-- Modal -->
    <div
      v-if="showCreate"
      class="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      @click.self="showCreate = false"
    >
      <div class="card w-full max-w-md mx-4 space-y-4">
        <h2 class="text-lg font-semibold">Neuen Plan anlegen</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Monat</label>
            <select v-model.number="form.month" class="select">
              <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">
                {{ m }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Jahr</label>
            <input v-model.number="form.year" type="number" class="input" />
          </div>
        </div>
        <div>
          <label class="label">Titel (optional)</label>
          <input
            v-model="form.title"
            class="input"
            placeholder="z. B. Frühjahrssaison"
          />
        </div>
        <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="showCreate = false">
            Abbrechen
          </button>
          <button class="btn-lime" @click="createPlan">Anlegen</button>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div
      v-if="deleteModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      @click.self="deleteModal = null"
    >
      <div class="card w-full max-w-sm mx-4 space-y-4">
        <h2 class="text-lg font-semibold text-red-600">Plan löschen?</h2>
        <p class="text-sm text-ink-600">
          Der Plan "{{ monthNames[deleteModal.month - 1] }}
          {{ deleteModal.year }}" wird mit
          <strong>{{ deleteModal.slot_count }} Slots</strong> gelöscht.
        </p>
        <p class="text-xs text-ink-500">
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div v-if="error" class="text-sm text-red-600">{{ error }}</div>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-ghost" @click="deleteModal = null">
            Abbrechen
          </button>
          <button class="btn-danger" @click="deletePlan">Löschen</button>
        </div>
      </div>
    </div>
  </section>
</template>
