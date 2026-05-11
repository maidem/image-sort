<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { data: groups, refresh: refreshGroups } =
  await useFetch<any[]>("/api/groups");
const groupsRef = ref(groups || []);
const { data: trainers, refresh: refreshTrainers } =
  await useFetch<any[]>("/api/trainers");
const trainersRef = ref(trainers || []);

// Auto-sync with live updates and fallback refreshes
useSyncData(groupsRef, "groups", "id", refreshGroups);
useSyncData(trainersRef, "trainers", "id", refreshTrainers);

const form = reactive({ name: "", description: "" });
const error = ref("");

const editing = ref<number | null>(null);
const editForm = reactive<{
  name: string;
  description: string;
  trainerIds: number[];
}>({
  name: "",
  description: "",
  trainerIds: [],
});

async function add() {
  error.value = "";
  try {
    await $fetch("/api/groups", { method: "POST", body: { ...form } });
    form.name = "";
    form.description = "";
    // New group will be added via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

function startEdit(g: any) {
  editing.value = g.id;
  editForm.name = g.name;
  editForm.description = g.description || "";
  editForm.trainerIds = (g.trainers || []).map((t: any) => t.id);
}

async function save(id: number) {
  await $fetch(`/api/groups/${id}`, { method: "PATCH", body: { ...editForm } });
  editing.value = null;
  // Update will come via WebSocket event
}

async function remove(id: number) {
  if (!confirm("Gruppe wirklich löschen?")) return;
  await $fetch(`/api/groups/${id}`, { method: "DELETE" });
  // Deletion will come via WebSocket event
}

function toggleTrainer(id: number) {
  const i = editForm.trainerIds.indexOf(id);
  if (i >= 0) editForm.trainerIds.splice(i, 1);
  else editForm.trainerIds.push(id);
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Gruppen</h1>
      <p class="text-ink-500 mt-1">Gruppen anlegen und Trainer zuordnen.</p>
    </div>

    <div class="card">
      <h2 class="font-medium mb-4">Neue Gruppe</h2>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto] gap-3 items-end"
      >
        <div>
          <label class="label">Name</label>
          <input v-model="form.name" class="input" placeholder="z. B. U10" />
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
      <div v-for="g in groupsRef" :key="g.id" class="card space-y-3">
        <div v-if="editing === g.id" class="space-y-3">
          <div>
            <label class="label">Name</label>
            <input v-model="editForm.name" class="input" />
          </div>
          <div>
            <label class="label">Beschreibung</label>
            <input v-model="editForm.description" class="input" />
          </div>
          <div>
            <label class="label">Trainer zuordnen</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="t in trainers"
                :key="t.id"
                type="button"
                class="chip text-xs"
                :class="
                  editForm.trainerIds.includes(t.id)
                    ? '!bg-ink-900 !text-white !border-ink-900'
                    : ''
                "
                @click="toggleTrainer(t.id)"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :style="{ background: t.color }"
                ></span>
                {{ t.name }}
              </button>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-ink-100">
            <button class="btn-ghost text-xs flex-1" @click="editing = null">
              Abbruch
            </button>
            <button class="btn-primary text-xs flex-1" @click="save(g.id)">
              Speichern
            </button>
          </div>
        </div>

        <div v-else>
          <div class="flex items-start justify-between gap-2 mb-3">
            <div class="min-w-0 flex-1">
              <div class="text-lg font-semibold truncate">{{ g.name }}</div>
              <div v-if="g.description" class="text-sm text-ink-500 truncate">
                {{ g.description }}
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button class="btn-ghost text-xs" @click="startEdit(g)">✎</button>
              <button class="btn-danger text-xs" @click="remove(g.id)">
                ✕
              </button>
            </div>
          </div>
          <div class="divider my-3"></div>
          <div class="flex flex-wrap gap-2">
            <span v-if="!g.trainers?.length" class="text-xs text-ink-500"
              >Keine Trainer zugeordnet</span
            >
            <span v-for="t in g.trainers" :key="t.id" class="chip text-xs">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :style="{ background: t.color }"
              ></span>
              {{ t.name }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="!groups?.length" class="card text-center text-ink-500 py-10">
        Noch keine Gruppen angelegt.
      </div>
    </div>
  </section>
</template>
