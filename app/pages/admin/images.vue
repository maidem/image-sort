<script setup lang="ts">
import type { Category, ImagePair } from "~/../../types/models";

definePageMeta({ middleware: "admin" });

const { data: categories } = await useFetch<(Category & { image_count: number })[]>("/api/categories");
const { data: pairs, refresh } = await useFetch<ImagePair[]>("/api/image-pairs");

const selectedCategory = ref<number | null>(null);

const filteredPairs = computed(() => {
  if (!pairs.value) return [];
  if (selectedCategory.value === null) return pairs.value;
  return pairs.value.filter((p) => p.category_id === selectedCategory.value);
});

// Upload form
const showUpload = ref(false);
const uploadCategoryId = ref<number | null>(null);
const uploadOriginal = ref<File | null>(null);
const uploadPainted = ref<File | null>(null);
const uploadDescription = ref("");
const uploadPaintedAt = ref("");
const uploading = ref(false);
const uploadError = ref("");

function onOriginal(e: Event) {
  uploadOriginal.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}
function onPainted(e: Event) {
  uploadPainted.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

async function doUpload() {
  if (!uploadCategoryId.value) { uploadError.value = "Bitte Kategorie wählen"; return; }
  uploading.value = true;
  uploadError.value = "";
  try {
    const fd = new FormData();
    fd.append("category_id", String(uploadCategoryId.value));
    if (uploadOriginal.value) fd.append("original", uploadOriginal.value);
    if (uploadPainted.value) fd.append("painted", uploadPainted.value);
    if (uploadDescription.value.trim()) fd.append("description", uploadDescription.value.trim());
    if (uploadPaintedAt.value) fd.append("painted_at", uploadPaintedAt.value);
    await $fetch("/api/image-pairs", { method: "POST", body: fd });
    showUpload.value = false;
    uploadOriginal.value = null;
    uploadPainted.value = null;
    uploadDescription.value = "";
    uploadPaintedAt.value = "";
    await refresh();
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || "Upload fehlgeschlagen";
  } finally {
    uploading.value = false;
  }
}

// Edit form
const editPair = ref<ImagePair | null>(null);
const editDescription = ref("");
const editPaintedAt = ref("");
const editCategoryId = ref<number | null>(null);
const editSaving = ref(false);

function openEdit(pair: ImagePair) {
  editPair.value = pair;
  editDescription.value = pair.description || "";
  editPaintedAt.value = pair.painted_at || "";
  editCategoryId.value = pair.category_id;
}

async function saveEdit() {
  if (!editPair.value) return;
  editSaving.value = true;
  try {
    await $fetch(`/api/image-pairs/${editPair.value.id}`, {
      method: "PATCH",
      body: {
        description: editDescription.value.trim() || null,
        painted_at: editPaintedAt.value || null,
        category_id: editCategoryId.value,
      },
    });
    editPair.value = null;
    await refresh();
  } finally {
    editSaving.value = false;
  }
}

async function deletePair(pair: ImagePair) {
  if (!confirm("Bildpaar komplett löschen?")) return;
  await $fetch(`/api/image-pairs/${pair.id}`, { method: "DELETE" });
  await refresh();
}

async function deleteOriginal(pair: ImagePair) {
  if (!confirm("Original-Foto löschen?")) return;
  await $fetch(`/api/image-pairs/${pair.id}/original`, { method: "DELETE" });
  await refresh();
}

async function deletePainted(pair: ImagePair) {
  if (!confirm("Gemälde-Foto löschen?")) return;
  await $fetch(`/api/image-pairs/${pair.id}/painted`, { method: "DELETE" });
  await refresh();
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Bildpaare</h1>
      <button class="btn-lime" @click="showUpload = !showUpload">
        {{ showUpload ? "Abbrechen" : "+ Bildpaar hochladen" }}
      </button>
    </div>

    <!-- Upload form -->
    <div v-if="showUpload" class="card space-y-4">
      <h2 class="font-medium">Neues Bildpaar</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="label">Kategorie *</label>
          <select v-model="uploadCategoryId" class="select">
            <option :value="null" disabled>Wählen…</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">Gemalt am</label>
          <input v-model="uploadPaintedAt" type="date" class="input" />
        </div>
        <div>
          <label class="label">Original-Foto (links)</label>
          <input type="file" accept="image/*" class="input !py-1.5" @change="onOriginal" />
        </div>
        <div>
          <label class="label">Gemälde-Foto (rechts) *</label>
          <input type="file" accept="image/*" class="input !py-1.5" @change="onPainted" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Bildbeschreibung</label>
          <textarea v-model="uploadDescription" class="textarea" rows="3" />
        </div>
      </div>
      <p v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</p>
      <button class="btn-lime" :disabled="uploading" @click="doUpload">
        {{ uploading ? "Wird hochgeladen…" : "Hochladen" }}
      </button>
    </div>

    <!-- Category filter -->
    <div class="flex flex-wrap gap-2">
      <button
        class="btn"
        :class="selectedCategory === null ? 'btn-primary' : 'btn-ghost'"
        @click="selectedCategory = null"
      >Alle</button>
      <button
        v-for="c in categories"
        :key="c.id"
        class="btn"
        :class="selectedCategory === c.id ? 'btn-primary' : 'btn-ghost'"
        @click="selectedCategory = c.id"
      >{{ c.name }}</button>
    </div>

    <!-- Edit modal -->
    <div v-if="editPair" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="card w-full max-w-md space-y-4">
        <h2 class="font-medium">Bildpaar bearbeiten</h2>
        <div>
          <label class="label">Kategorie</label>
          <select v-model="editCategoryId" class="select">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="label">Gemalt am</label>
          <input v-model="editPaintedAt" type="date" class="input" />
        </div>
        <div>
          <label class="label">Bildbeschreibung</label>
          <textarea v-model="editDescription" class="textarea" rows="3" />
        </div>
        <div class="flex gap-2">
          <button class="btn-lime" :disabled="editSaving" @click="saveEdit">
            {{ editSaving ? "…" : "Speichern" }}
          </button>
          <button class="btn-ghost" @click="editPair = null">Abbrechen</button>
        </div>
      </div>
    </div>

    <!-- Pairs grid -->
    <div v-if="filteredPairs.length" class="space-y-4">
      <div
        v-for="pair in filteredPairs"
        :key="pair.id"
        class="card space-y-3"
      >
        <!-- Meta row -->
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span class="chip text-xs">{{ pair.category_name }}</span>
            <p v-if="pair.painted_at" class="text-xs text-ink-400 mt-1">Gemalt am: {{ pair.painted_at }}</p>
            <p v-if="pair.description" class="text-sm text-ink-600 mt-1">{{ pair.description }}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button class="btn-ghost !px-3 !py-1.5 text-xs" @click="openEdit(pair)">Bearbeiten</button>
            <button class="btn-danger !px-3 !py-1.5 text-xs" @click="deletePair(pair)">Paar löschen</button>
          </div>
        </div>

        <!-- Images side by side -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Original -->
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Original (links)</p>
            <div class="relative aspect-square bg-ink-100 rounded-xl overflow-hidden">
              <img
                v-if="pair.original_filename"
                :src="`/api/uploads/${pair.original_filename}`"
                class="w-full h-full object-cover"
                alt="Original"
              />
              <div v-else class="flex items-center justify-center h-full text-ink-300 text-sm">
                Kein Foto
              </div>
            </div>
            <button
              v-if="pair.original_filename"
              class="btn-danger w-full !py-1.5 text-xs"
              @click="deleteOriginal(pair)"
            >Original löschen</button>
          </div>

          <!-- Painted -->
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-ink-400">Gemälde (rechts)</p>
            <div class="relative aspect-square bg-ink-100 rounded-xl overflow-hidden">
              <img
                v-if="pair.painted_filename"
                :src="`/api/uploads/${pair.painted_filename}`"
                class="w-full h-full object-cover"
                alt="Gemälde"
              />
              <div v-else class="flex items-center justify-center h-full text-ink-300 text-sm">
                Kein Foto
              </div>
            </div>
            <button
              v-if="pair.painted_filename"
              class="btn-danger w-full !py-1.5 text-xs"
              @click="deletePainted(pair)"
            >Gemälde löschen</button>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="text-ink-400 text-sm">Keine Bildpaare vorhanden.</p>
  </div>
</template>
