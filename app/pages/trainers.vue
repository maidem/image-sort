<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { data: trainers, refresh } = await useFetch<any[]>("/api/trainers");
const trainersRef = ref(trainers || []);

// Auto-sync with live updates and fallback refreshes
useSyncData(trainersRef, "trainers", "id", refresh);

const form = reactive({ name: "", pin: "", color: "#a3e635" });
const error = ref("");
const editing = ref<number | null>(null);
const editForm = reactive({ name: "", pin: "", color: "" });

async function add() {
  error.value = "";
  try {
    await $fetch("/api/trainers", { method: "POST", body: { ...form } });
    form.name = "";
    form.pin = "";
    // New trainer will be added via WebSocket event
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

function startEdit(t: any) {
  editing.value = t.id;
  editForm.name = t.name;
  editForm.pin = "";
  editForm.color = t.color;
}

async function saveEdit(id: number) {
  await $fetch(`/api/trainers/${id}`, {
    method: "PATCH",
    body: {
      name: editForm.name,
      color: editForm.color,
      ...(editForm.pin ? { pin: editForm.pin } : {}),
    },
  });
  editing.value = null;
  // Update will come via WebSocket event
}

async function remove(id: number) {
  if (!confirm("Trainer wirklich löschen?")) return;
  await $fetch(`/api/trainers/${id}`, { method: "DELETE" });
  // Deletion will come via WebSocket event
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Trainer</h1>
      <p class="text-ink-500 mt-1">
        Trainer anlegen und verwalten. PIN wird für den Check-in benötigt.
      </p>
    </div>

    <div class="card">
      <h2 class="font-medium mb-4">Neuen Trainer anlegen</h2>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_140px_120px_auto] gap-3 items-end"
      >
        <div>
          <label class="label">Name</label>
          <input
            v-model="form.name"
            class="input"
            placeholder="Vor- und Nachname"
          />
        </div>
        <div>
          <label class="label">PIN (4-stellig)</label>
          <input
            v-model="form.pin"
            class="input"
            placeholder="0000"
            maxlength="6"
          />
        </div>
        <div>
          <label class="label">Farbe</label>
          <input v-model="form.color" type="color" class="input h-10 p-1" />
        </div>
        <button class="btn-lime w-full lg:w-auto" @click="add">Anlegen</button>
      </div>
      <div v-if="error" class="text-sm text-red-600 mt-3">{{ error }}</div>
    </div>

    <!-- Desktop Table View -->
    <div class="hidden md:block card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead
            class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider"
          >
            <tr>
              <th class="text-left px-5 py-3">Trainer</th>
              <th class="text-left px-5 py-3">Farbe</th>
              <th class="text-left px-5 py-3">PIN</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in trainersRef"
              :key="t.id"
              class="border-t border-ink-100"
            >
              <td class="px-5 py-3">
                <template v-if="editing === t.id">
                  <input v-model="editForm.name" class="input" />
                </template>
                <template v-else>
                  <div class="flex items-center gap-2">
                    <span
                      class="h-2.5 w-2.5 rounded-full"
                      :style="{ background: t.color }"
                    ></span>
                    <span class="font-medium">{{ t.name }}</span>
                  </div>
                </template>
              </td>
              <td class="px-5 py-3">
                <input
                  v-if="editing === t.id"
                  v-model="editForm.color"
                  type="color"
                  class="input h-9 p-1 w-20"
                />
                <span v-else class="font-mono text-xs text-ink-500">{{
                  t.color
                }}</span>
              </td>
              <td class="px-5 py-3">
                <input
                  v-if="editing === t.id"
                  v-model="editForm.pin"
                  class="input w-28"
                  placeholder="(neu)"
                />
                <span v-else class="font-mono text-xs text-ink-500">••••</span>
              </td>
              <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                <template v-if="editing === t.id">
                  <button class="btn-ghost text-xs" @click="editing = null">
                    Abbruch
                  </button>
                  <button class="btn-primary text-xs" @click="saveEdit(t.id)">
                    Speichern
                  </button>
                </template>
                <template v-else>
                  <button class="btn-ghost text-xs" @click="startEdit(t)">
                    ✎
                  </button>
                  <button class="btn-danger text-xs" @click="remove(t.id)">
                    ✕
                  </button>
                </template>
              </td>
            </tr>
            <tr v-if="!trainers?.length">
              <td
                colspan="4"
                class="px-5 py-8 text-center text-ink-500 text-sm"
              >
                Noch keine Trainer angelegt.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-3">
      <div v-if="trainers?.length" class="space-y-3">
        <div v-for="t in trainers" :key="t.id" class="card space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="h-3 w-3 rounded-full flex-shrink-0"
                :style="{ background: t.color }"
              ></span>
              <span v-if="editing !== t.id" class="font-medium truncate">{{
                t.name
              }}</span>
              <input
                v-else
                v-model="editForm.name"
                class="input text-sm w-full"
              />
            </div>
            <template v-if="editing === t.id">
              <button
                class="btn-primary text-xs flex-shrink-0"
                @click="saveEdit(t.id)"
              >
                ✓
              </button>
            </template>
            <template v-else>
              <button
                class="btn-ghost text-xs flex-shrink-0"
                @click="startEdit(t)"
              >
                ✎
              </button>
            </template>
          </div>
          <div v-if="editing === t.id" class="grid grid-cols-2 gap-2">
            <div>
              <label class="label text-xs">Farbe</label>
              <input
                v-model="editForm.color"
                type="color"
                class="input h-9 p-1 w-full"
              />
            </div>
            <div>
              <label class="label text-xs">PIN (neu)</label>
              <input
                v-model="editForm.pin"
                class="input text-sm"
                placeholder="—"
              />
            </div>
          </div>
          <div
            v-if="editing === t.id"
            class="flex gap-2 pt-2 border-t border-ink-100"
          >
            <button class="btn-ghost text-xs flex-1" @click="editing = null">
              Abbruch
            </button>
            <button class="btn-danger text-xs flex-1" @click="remove(t.id)">
              Löschen
            </button>
          </div>
        </div>
      </div>
      <div v-else class="card text-center py-8 text-ink-500 text-sm">
        Noch keine Trainer angelegt.
      </div>
    </div>
  </section>
</template>
