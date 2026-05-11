<script setup lang="ts">
import type { Category } from "~/../../types/models";

definePageMeta({ middleware: "admin" });

const { data: categories, refresh } = await useFetch<Category[]>("/api/categories");

const showForm = ref(false);
const editTarget = ref<Category | null>(null);
const name = ref("");
const description = ref("");
const saving = ref(false);
const error = ref("");

function openCreate() {
  editTarget.value = null;
  name.value = "";
  description.value = "";
  error.value = "";
  showForm.value = true;
}

function openEdit(cat: Category) {
  editTarget.value = cat;
  name.value = cat.name;
  description.value = cat.description || "";
  error.value = "";
  showForm.value = true;
}

async function save() {
  if (!name.value.trim()) { error.value = "Name erforderlich"; return; }
  saving.value = true;
  error.value = "";
  try {
    if (editTarget.value) {
      await $fetch(`/api/categories/${editTarget.value.id}`, {
        method: "PATCH",
        body: { name: name.value.trim(), description: description.value.trim() || null },
      });
    } else {
      await $fetch("/api/categories", {
        method: "POST",
        body: { name: name.value.trim(), description: description.value.trim() || null },
      });
    }
    showForm.value = false;
    await refresh();
  } catch (e: any) {
    error.value = e?.data?.statusMessage || "Fehler beim Speichern";
  } finally {
    saving.value = false;
  }
}

async function remove(cat: Category) {
  if (!confirm(`Kategorie "${cat.name}" und alle Bilder darin löschen?`)) return;
  await $fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
  await refresh();
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">Kategorien</h1>
      <button class="btn-lime" @click="openCreate">+ Neue Kategorie</button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="card space-y-4">
      <h2 class="font-medium">{{ editTarget ? "Kategorie bearbeiten" : "Neue Kategorie" }}</h2>
      <div>
        <label class="label">Name</label>
        <input v-model="name" class="input" type="text" autofocus />
      </div>
      <div>
        <label class="label">Beschreibung (optional)</label>
        <input v-model="description" class="input" type="text" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex gap-2">
        <button class="btn-lime" :disabled="saving" @click="save">
          {{ saving ? "…" : "Speichern" }}
        </button>
        <button class="btn-ghost" @click="showForm = false">Abbrechen</button>
      </div>
    </div>

    <!-- List -->
    <div v-if="categories?.length" class="space-y-2">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="card flex items-center justify-between gap-4"
      >
        <div>
          <p class="font-medium">{{ cat.name }}</p>
          <p v-if="cat.description" class="text-sm text-ink-500">{{ cat.description }}</p>
          <p class="text-xs text-ink-400 mt-0.5">{{ (cat as any).image_count }} Bildpaare</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button class="btn-ghost !px-3 !py-1.5 text-xs" @click="openEdit(cat)">Bearbeiten</button>
          <button class="btn-danger !px-3 !py-1.5 text-xs" @click="remove(cat)">Löschen</button>
        </div>
      </div>
    </div>
    <p v-else class="text-ink-400 text-sm">Noch keine Kategorien vorhanden.</p>
  </div>
</template>
