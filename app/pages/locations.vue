<script setup lang="ts">
definePageMeta({ middleware: "admin" });

const { data: locations, refresh } = await useFetch<any[]>("/api/locations");
const locationsRef = ref(locations || []);

// Auto-sync with live updates and fallback refreshes
useSyncData(locationsRef, "locations", "id", refresh);

const form = reactive({ name: "", description: "" });
const error = ref("");

const editing = ref<number | null>(null);
const editForm = reactive({ name: "", description: "" });

async function add() {
  error.value = "";
  try {
    await $fetch("/api/locations", {
      method: "POST",
      body: { ...form },
    });
    form.name = "";
    form.description = "";
    // New location will be added via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

function startEdit(location: any) {
  editing.value = location.id;
  editForm.name = location.name;
  editForm.description = location.description || "";
}

async function save(id: number) {
  error.value = "";
  try {
    await $fetch(`/api/locations/${id}`, {
      method: "PATCH",
      body: { ...editForm },
    });
    editing.value = null;
    // Update will come via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

async function remove(id: number) {
  if (!confirm("Standort wirklich löschen?")) return;
  error.value = "";
  try {
    await $fetch(`/api/locations/${id}`, { method: "DELETE" });
    // Deletion will come via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Standorte</h1>
      <p class="text-ink-500 mt-1">
        Standorte anlegen und bearbeiten, damit sie bei Slots ausgewählt werden
        können.
      </p>
    </div>

    <div class="card">
      <h2 class="font-medium mb-4">Neuen Standort anlegen</h2>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto] gap-3 items-end"
      >
        <div>
          <label class="label">Name</label>
          <input
            v-model="form.name"
            class="input"
            placeholder="z. B. Halle Nord"
          />
        </div>
        <div>
          <label class="label">Beschreibung</label>
          <input
            v-model="form.description"
            class="input"
            placeholder="optional"
          />
        </div>
        <button class="btn-lime w-full lg:w-auto" @click="add">Anlegen</button>
      </div>
      <div v-if="error" class="text-sm text-red-600 mt-3">{{ error }}</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="location in locationsRef"
        :key="location.id"
        class="card space-y-3"
      >
        <div v-if="editing === location.id" class="space-y-3">
          <div>
            <label class="label">Name</label>
            <input v-model="editForm.name" class="input" />
          </div>
          <div>
            <label class="label">Beschreibung</label>
            <input v-model="editForm.description" class="input" />
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-ink-100">
            <button class="btn-ghost text-xs flex-1" @click="editing = null">
              Abbruch
            </button>
            <button
              class="btn-primary text-xs flex-1"
              @click="save(location.id)"
            >
              Speichern
            </button>
          </div>
        </div>

        <div v-else>
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="min-w-0 flex-1">
              <div class="text-lg font-semibold truncate">
                {{ location.name }}
              </div>
              <div
                v-if="location.description"
                class="text-sm text-ink-500 break-words"
              >
                {{ location.description }}
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button class="btn-ghost text-xs" @click="startEdit(location)">
                ✎
              </button>
              <button class="btn-danger text-xs" @click="remove(location.id)">
                ✕
              </button>
            </div>
          </div>
          <div v-if="!location.description" class="text-xs italic text-ink-400">
            keine Beschreibung
          </div>
        </div>
      </div>

      <div
        v-if="!locationsRef.length"
        class="card text-center text-ink-500 py-10"
      >
        Noch keine Standorte angelegt.
      </div>
    </div>
  </section>
</template>
