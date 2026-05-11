<script setup lang="ts">
import type { Category } from "~/../../types/models";
import Sortable from "sortablejs";

definePageMeta({ middleware: "admin" });

const { data: categories, refresh } =
  await useFetch<Category[]>("/api/categories");

const showForm = ref(false);
const editTarget = ref<Category | null>(null);
const name = ref("");
const description = ref("");
const saving = ref(false);
const error = ref("");

const sortableList = ref<HTMLElement | null>(null);

// Initialize Sortable
onMounted(() => {
  if (sortableList.value) {
    Sortable.create(sortableList.value, {
      animation: 150,
      ghostClass: "opacity-50",
      handle: ".drag-handle",
      onEnd: async (evt) => {
        if (!categories.value) return;

        // Reorder array based on drag result
        const movedItem = categories.value[evt.oldIndex!];
        categories.value.splice(evt.oldIndex!, 1);
        categories.value.splice(evt.newIndex!, 0, movedItem);

        // Update sort_order based on new positions
        const reorderData = categories.value.map((cat, idx) => ({
          id: cat.id,
          sort_order: idx,
        }));

        // Send to server
        try {
          await $fetch("/api/categories/reorder", {
            method: "POST",
            body: reorderData,
          });
        } catch (e: any) {
          error.value =
            e?.data?.statusMessage || "Fehler beim Speichern der Reihenfolge";
          await refresh(); // Refresh to revert
        }
      },
    });
  }
});

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
  if (!name.value.trim()) {
    error.value = "Name erforderlich";
    return;
  }
  saving.value = true;
  error.value = "";
  try {
    if (editTarget.value) {
      await $fetch(`/api/categories/${editTarget.value.id}`, {
        method: "PATCH",
        body: {
          name: name.value.trim(),
          description: description.value.trim() || null,
        },
      });
    } else {
      await $fetch("/api/categories", {
        method: "POST",
        body: {
          name: name.value.trim(),
          description: description.value.trim() || null,
        },
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
  if (!confirm(`Kategorie "${cat.name}" und alle Bilder darin löschen?`))
    return;
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
      <h2 class="font-medium">
        {{ editTarget ? "Kategorie bearbeiten" : "Neue Kategorie" }}
      </h2>
      <div>
        <label class="label">Name</label>
        <input v-model="name" class="input" type="text" autofocus @keyup.enter="save" />
      </div>
      <div>
        <label class="label">Beschreibung (optional)</label>
        <input v-model="description" class="input" type="text" @keyup.enter="save" />
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
    <div v-if="categories?.length" ref="sortableList" class="space-y-2">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="card flex items-center gap-3 hover:shadow-md transition p-3 sm:p-5"
      >
        <!-- Drag Handle -->
        <div
          class="drag-handle flex items-center justify-center px-2 py-2 cursor-grab active:cursor-grabbing text-ink-300 hover:text-ink-600 transition flex-shrink-0"
        >
          <span class="text-lg leading-none">⋮⋮</span>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ cat.name }}</p>
          <p v-if="cat.description" class="text-sm text-ink-500 truncate">
            {{ cat.description }}
          </p>
          <p class="text-xs text-ink-400 mt-0.5">
            {{ (cat as any).image_count }} Bildpaare
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-1.5 shrink-0">
          <button
            class="btn-ghost !px-2.5 !py-1.5 text-xs"
            @click="openEdit(cat)"
          >
            <span class="hidden sm:inline">Bearbeiten</span>
            <span class="sm:hidden">✏️</span>
          </button>
          <button
            class="btn-danger !px-2.5 !py-1.5 text-xs"
            @click="remove(cat)"
          >
            <span class="hidden sm:inline">Löschen</span>
            <span class="sm:hidden">🗑️</span>
          </button>
        </div>
      </div>
    </div>
    <p v-else class="text-ink-400 text-sm">Noch keine Kategorien vorhanden.</p>
  </div>
</template>
