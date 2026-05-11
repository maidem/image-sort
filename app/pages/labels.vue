<script setup lang="ts">
definePageMeta({ middleware: "admin" });

const { data: labels, refresh } = await useFetch<any[]>("/api/labels");
const labelsRef = ref(labels || []);

useSyncData(labelsRef, "labels", "id", refresh);

const form = reactive({ name: "", description: "" });
const error = ref("");

const editing = ref<number | null>(null);
const editForm = reactive({ name: "", description: "" });

async function add() {
  error.value = "";
  try {
    await $fetch("/api/labels", {
      method: "POST",
      body: { ...form },
    });
    form.name = "";
    form.description = "";
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

function startEdit(label: any) {
  editing.value = label.id;
  editForm.name = label.name;
  editForm.description = label.description || "";
}

async function save(id: number) {
  error.value = "";
  try {
    await $fetch(`/api/labels/${id}`, {
      method: "PATCH",
      body: { ...editForm },
    });
    editing.value = null;
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}

async function remove(id: number) {
  if (!confirm("Label wirklich löschen?")) return;
  error.value = "";
  try {
    await $fetch(`/api/labels/${id}`, { method: "DELETE" });
  } catch (e: any) {
    error.value = e?.statusMessage || "Fehler";
  }
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Labels</h1>
      <p class="text-ink-500 mt-1">
        Kurze Merkmale für Slots. Zum Beispiel DOSB Elite Schule des Sports.
      </p>
    </div>

    <div class="card">
      <h2 class="font-medium mb-4">Neues Label anlegen</h2>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto] gap-3 items-end"
      >
        <div>
          <label class="label">Name</label>
          <input
            v-model="form.name"
            class="input"
            placeholder="z. B. DOSB Elite Schule des Sports"
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
      <div v-for="label in labelsRef" :key="label.id" class="card space-y-3">
        <div v-if="editing === label.id" class="space-y-3">
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
            <button class="btn-primary text-xs flex-1" @click="save(label.id)">
              Speichern
            </button>
          </div>
        </div>

        <div v-else>
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="min-w-0 flex-1">
              <div class="text-lg font-semibold break-words">
                {{ label.name }}
              </div>
              <div
                v-if="label.description"
                class="text-sm text-ink-500 break-words"
              >
                {{ label.description }}
              </div>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button class="btn-ghost text-xs" @click="startEdit(label)">
                ✎
              </button>
              <button class="btn-danger text-xs" @click="remove(label.id)">
                ✕
              </button>
            </div>
          </div>
          <div v-if="!label.description" class="text-xs italic text-ink-400">
            keine Beschreibung
          </div>
        </div>
      </div>

      <div v-if="!labelsRef.length" class="card text-center text-ink-500 py-10">
        Noch keine Labels angelegt.
      </div>
    </div>
  </section>
</template>
