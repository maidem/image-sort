<script setup lang="ts">
import type { Category, ImagePair } from "~/../../types/models";

definePageMeta({ middleware: "admin" });

const { data: categories } =
  await useFetch<(Category & { image_count: number })[]>("/api/categories");
const { data: pairs, refresh } =
  await useFetch<ImagePair[]>("/api/image-pairs");

// ─── Navigation ──────────────────────────────────────────────────────────────
const selectedCategoryId = ref<number | null>(null);
const selectedPairId = ref<number | null>(null);

const selectedCategory = computed(
  () =>
    categories.value?.find((c) => c.id === selectedCategoryId.value) ?? null,
);
const selectedPair = computed(
  () => pairs.value?.find((p) => p.id === selectedPairId.value) ?? null,
);
const categoryPairs = computed(() => {
  if (!pairs.value || selectedCategoryId.value === null) return [];
  return pairs.value.filter((p) => p.category_id === selectedCategoryId.value);
});

function pairsForCategory(catId: number) {
  return pairs.value?.filter((p) => p.category_id === catId) ?? [];
}

function selectCategory(id: number) {
  selectedCategoryId.value = id;
  selectedPairId.value = null;
  uploadCategoryId.value = id;
  showUpload.value = false;
}

function selectPair(pair: ImagePair) {
  selectedPairId.value = pair.id;
}

function goBackToCategory() {
  selectedPairId.value = null;
}

function goBackToOverview() {
  selectedCategoryId.value = null;
  selectedPairId.value = null;
  showUpload.value = false;
}

// ─── Upload form ─────────────────────────────────────────────────────────────
const showUpload = ref(false);
const uploadCategoryId = ref<number | null>(null);
const uploadOriginal = ref<File | null>(null);
const uploadPainted = ref<File | null>(null);
const uploadDescription = ref("");
const uploadPaintedAt = ref("");
const uploading = ref(false);
const uploadError = ref("");

const uploadOriginalUrl = computed(() =>
  uploadOriginal.value ? URL.createObjectURL(uploadOriginal.value) : null,
);
const uploadPaintedUrl = computed(() =>
  uploadPainted.value ? URL.createObjectURL(uploadPainted.value) : null,
);

// ─── Cropper ─────────────────────────────────────────────────────────────────
const cropperOpen = ref(false);
const cropperImageUrl = ref<string | null>(null);
const cropperMode = ref<"original" | "painted" | null>(null);
const cropperPairId = ref<number | null>(null);

function openCropper(file: File, mode: "original" | "painted") {
  cropperPairId.value = null;
  const reader = new FileReader();
  reader.onload = (ev) => {
    cropperImageUrl.value = ev.target?.result as string;
    cropperMode.value = mode;
    cropperOpen.value = true;
  };
  reader.readAsDataURL(file);
}

function openCropperForPair(pair: ImagePair, slot: "original" | "painted") {
  const filename =
    slot === "original" ? pair.original_filename : pair.painted_filename;
  if (!filename) return;
  cropperPairId.value = pair.id;
  cropperMode.value = slot;
  cropperImageUrl.value = `/api/uploads/${filename}`;
  cropperOpen.value = true;
}

function onOriginal(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) uploadOriginal.value = file;
}

function onPainted(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) uploadPainted.value = file;
}

// ─── Drag & drop helpers ─────────────────────────────────────────────────────
const dragOverOriginal = ref(false);
const dragOverPainted = ref(false);
const dragOverPairOriginal = ref(false);
const dragOverPairPainted = ref(false);

function onDropUpload(e: DragEvent, slot: "original" | "painted") {
  e.preventDefault();
  dragOverOriginal.value = false;
  dragOverPainted.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  if (slot === "original") uploadOriginal.value = file;
  else uploadPainted.value = file;
}

async function onDropPair(e: DragEvent, slot: "original" | "painted") {
  e.preventDefault();
  dragOverPairOriginal.value = false;
  dragOverPairPainted.value = false;
  if (!selectedPair.value) return;
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith("image/")) return;
  const fd = new FormData();
  fd.append(slot, file);
  await $fetch(`/api/image-pairs/${selectedPair.value.id}/${slot}`, {
    method: "POST",
    body: fd,
  });
  await refresh();
}

async function onCropperDone(blob: Blob) {
  const file = new File([blob], `${cropperMode.value}-${Date.now()}.png`, {
    type: "image/png",
  });

  if (cropperPairId.value !== null) {
    const fd = new FormData();
    fd.append(cropperMode.value!, file);
    await $fetch(
      `/api/image-pairs/${cropperPairId.value}/${cropperMode.value}`,
      {
        method: "POST",
        body: fd,
      },
    );
    await refresh();
  } else {
    if (cropperMode.value === "original") uploadOriginal.value = file;
    else if (cropperMode.value === "painted") uploadPainted.value = file;
  }

  cropperOpen.value = false;
  cropperImageUrl.value = null;
  cropperMode.value = null;
  cropperPairId.value = null;
}

// ─── Upload ───────────────────────────────────────────────────────────────────
async function doUpload() {
  if (!uploadCategoryId.value) {
    uploadError.value = "Bitte Kategorie wählen";
    return;
  }
  uploading.value = true;
  uploadError.value = "";
  try {
    const fd = new FormData();
    fd.append("category_id", String(uploadCategoryId.value));
    if (uploadOriginal.value) fd.append("original", uploadOriginal.value);
    if (uploadPainted.value) fd.append("painted", uploadPainted.value);
    if (uploadDescription.value.trim())
      fd.append("description", uploadDescription.value.trim());
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

// ─── Edit pair ────────────────────────────────────────────────────────────────
const editDescription = ref("");
const editPaintedAt = ref("");
const editCategoryId = ref<number | null>(null);
const editSaving = ref(false);

watch(
  selectedPair,
  (pair) => {
    if (pair) {
      editDescription.value = pair.description || "";
      editPaintedAt.value = pair.painted_at || "";
      editCategoryId.value = pair.category_id;
    }
  },
  { immediate: true },
);

async function saveEdit() {
  if (!selectedPair.value) return;
  editSaving.value = true;
  try {
    await $fetch(`/api/image-pairs/${selectedPair.value.id}`, {
      method: "PATCH",
      body: {
        description: editDescription.value.trim() || null,
        painted_at: editPaintedAt.value || null,
        category_id: editCategoryId.value,
      },
    });
    await refresh();
  } finally {
    editSaving.value = false;
  }
}

async function deletePair(pair: ImagePair) {
  if (!confirm("Bildpaar komplett löschen?")) return;
  await $fetch(`/api/image-pairs/${pair.id}`, { method: "DELETE" });
  await refresh();
  goBackToCategory();
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

async function replaceImage(pair: ImagePair, slot: "original" | "painted") {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append(slot, file);
    await $fetch(`/api/image-pairs/${pair.id}/${slot}`, {
      method: "POST",
      body: fd,
    });
    await refresh();
  };
  input.click();
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- ── ÜBERSICHT: Kategorien als Karten ────────────────────────────────── -->
    <template v-if="selectedCategoryId === null">
      <h1 class="text-2xl font-semibold tracking-tight">Bildpaare</h1>

      <div
        v-if="categories?.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="card cursor-pointer hover:shadow-lg hover:border-pink-300 transition-all p-4 space-y-3"
          @click="selectCategory(cat.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold text-base leading-tight">
              {{ cat.name }}
            </h2>
            <span class="chip text-xs shrink-0">
              {{ pairsForCategory(cat.id).length }} Paare
            </span>
          </div>
          <p v-if="cat.description" class="text-xs text-ink-400 line-clamp-2">
            {{ cat.description }}
          </p>
          <!-- Vorschau: erste 4 Bilder -->
          <div class="grid grid-cols-4 gap-1">
            <div
              v-for="pair in pairsForCategory(cat.id).slice(0, 4)"
              :key="pair.id"
              class="aspect-square bg-ink-100 rounded overflow-hidden"
            >
              <img
                v-if="pair.original_filename || pair.painted_filename"
                :src="`/api/uploads/${pair.original_filename || pair.painted_filename}`"
                class="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <!-- Leere Platzhalter -->
            <div
              v-for="i in Math.max(0, 4 - pairsForCategory(cat.id).length)"
              :key="`ph${i}`"
              class="aspect-square bg-ink-50 rounded border border-dashed border-ink-200"
            />
          </div>
        </div>
      </div>
      <p v-else class="text-ink-400 text-sm">
        Noch keine Kategorien vorhanden. Bitte zuerst Kategorien anlegen.
      </p>
    </template>

    <!-- ── KATEGORIE-ANSICHT: Bildpaare als Kacheln ────────────────────────── -->
    <template v-else-if="selectedPairId === null">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="btn-ghost !px-3 !py-1.5 text-sm"
          @click="goBackToOverview"
        >
          ← Übersicht
        </button>
        <h1 class="text-xl font-semibold tracking-tight flex-1">
          {{ selectedCategory?.name }}
        </h1>
        <button class="btn-lime" @click="showUpload = !showUpload">
          {{ showUpload ? "Abbrechen" : "+ Bildpaar hochladen" }}
        </button>
      </div>

      <!-- Upload-Formular -->
      <div v-if="showUpload" class="card space-y-4">
        <h2 class="font-medium">Neues Bildpaar</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Kategorie *</label>
            <select v-model="uploadCategoryId" class="select">
              <option :value="null" disabled>Wählen…</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Gemalt am</label>
            <input v-model="uploadPaintedAt" type="date" class="input" />
          </div>
          <div>
            <label class="label">Original-Foto (links)</label>
            <div v-if="uploadOriginal" class="space-y-2">
              <div class="aspect-square bg-ink-100 rounded-lg overflow-hidden">
                <img
                  :src="uploadOriginalUrl!"
                  class="w-full h-full object-contain"
                  alt="Vorschau"
                />
              </div>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  class="btn-ghost text-xs flex-1"
                  @click="openCropper(uploadOriginal!, 'original')"
                >
                  ✏️ Zuschneiden
                </button>
                <button
                  type="button"
                  class="btn-danger text-xs flex-1"
                  @click="uploadOriginal = null"
                >
                  Entfernen
                </button>
              </div>
            </div>
            <label
              v-else
              class="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-colors"
              :class="
                dragOverOriginal
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-ink-200 bg-ink-50 hover:border-pink-300'
              "
              @dragover.prevent="dragOverOriginal = true"
              @dragleave="dragOverOriginal = false"
              @drop="onDropUpload($event, 'original')"
            >
              <span class="text-2xl">🖼️</span>
              <span class="text-xs text-ink-400 text-center px-2"
                >Ziehen oder klicken</span
              >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="onOriginal"
              />
            </label>
          </div>
          <div>
            <label class="label">Gemälde-Foto (rechts)</label>
            <div v-if="uploadPainted" class="space-y-2">
              <div class="aspect-square bg-ink-100 rounded-lg overflow-hidden">
                <img
                  :src="uploadPaintedUrl!"
                  class="w-full h-full object-contain"
                  alt="Vorschau"
                />
              </div>
              <div class="flex gap-1.5">
                <button
                  type="button"
                  class="btn-ghost text-xs flex-1"
                  @click="openCropper(uploadPainted!, 'painted')"
                >
                  ✏️ Zuschneiden
                </button>
                <button
                  type="button"
                  class="btn-danger text-xs flex-1"
                  @click="uploadPainted = null"
                >
                  Entfernen
                </button>
              </div>
            </div>
            <label
              v-else
              class="flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-colors"
              :class="
                dragOverPainted
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-ink-200 bg-ink-50 hover:border-pink-300'
              "
              @dragover.prevent="dragOverPainted = true"
              @dragleave="dragOverPainted = false"
              @drop="onDropUpload($event, 'painted')"
            >
              <span class="text-2xl">🖼️</span>
              <span class="text-xs text-ink-400 text-center px-2"
                >Ziehen oder klicken</span
              >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="onPainted"
              />
            </label>
          </div>
          <div class="sm:col-span-2">
            <label class="label">Bildbeschreibung</label>
            <textarea v-model="uploadDescription" class="textarea" rows="2" />
          </div>
        </div>
        <p v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</p>
        <button class="btn-lime" :disabled="uploading" @click="doUpload">
          {{ uploading ? "Wird hochgeladen…" : "Hochladen" }}
        </button>
      </div>

      <!-- Kachel-Raster -->
      <div
        v-if="categoryPairs.length"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        <div
          v-for="pair in categoryPairs"
          :key="pair.id"
          class="card !p-2 cursor-pointer hover:shadow-md hover:border-pink-300 transition-all space-y-2"
          @click="selectPair(pair)"
        >
          <div class="grid grid-cols-2 gap-1">
            <div class="aspect-square bg-ink-100 rounded overflow-hidden">
              <img
                v-if="pair.original_filename"
                :src="`/api/uploads/${pair.original_filename}`"
                class="w-full h-full object-contain"
                loading="lazy"
                alt="Original"
              />
              <div
                v-else
                class="flex items-center justify-center h-full text-ink-300 text-xs"
              >
                —
              </div>
            </div>
            <div class="aspect-square bg-ink-100 rounded overflow-hidden">
              <img
                v-if="pair.painted_filename"
                :src="`/api/uploads/${pair.painted_filename}`"
                class="w-full h-full object-contain"
                loading="lazy"
                alt="Gemälde"
              />
              <div
                v-else
                class="flex items-center justify-center h-full text-ink-300 text-xs"
              >
                —
              </div>
            </div>
          </div>
          <p class="text-xs text-ink-400 truncate text-center leading-tight">
            {{
              pair.description ||
              (pair.painted_at ? pair.painted_at : "#" + pair.id)
            }}
          </p>
        </div>
      </div>
      <p v-else class="text-ink-400 text-sm">
        Noch keine Bildpaare in dieser Kategorie.
      </p>
    </template>

    <!-- ── PAAR-BEARBEITUNG ────────────────────────────────────────────────── -->
    <template v-else-if="selectedPair">
      <!-- Header -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="btn-ghost !px-3 !py-1.5 text-sm"
          @click="goBackToCategory"
        >
          ← {{ selectedCategory?.name }}
        </button>
        <h1 class="text-xl font-semibold tracking-tight flex-1">
          Bildpaar bearbeiten
        </h1>
        <button
          class="btn-danger !px-3 !py-1.5 text-sm"
          @click="deletePair(selectedPair)"
        >
          Paar löschen
        </button>
      </div>

      <!-- Metadaten -->
      <div class="card space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Kategorie</label>
            <select v-model="editCategoryId" class="select">
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Gemalt am</label>
            <input v-model="editPaintedAt" type="date" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">Bildbeschreibung</label>
            <textarea v-model="editDescription" class="textarea" rows="2" />
          </div>
        </div>
        <button class="btn-lime" :disabled="editSaving" @click="saveEdit">
          {{ editSaving ? "…" : "Metadaten speichern" }}
        </button>
      </div>

      <!-- Bilder -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Original -->
        <div class="card space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-400">
            Original (links)
          </p>
          <div
            class="rounded-xl overflow-hidden transition-colors"
            :class="
              dragOverPairOriginal
                ? 'ring-2 ring-pink-400 bg-pink-50'
                : 'bg-ink-100'
            "
            style="aspect-ratio: 4/3"
            @dragover.prevent="dragOverPairOriginal = true"
            @dragleave="dragOverPairOriginal = false"
            @drop="onDropPair($event, 'original')"
          >
            <img
              v-if="selectedPair.original_filename"
              :src="`/api/uploads/${selectedPair.original_filename}`"
              class="w-full h-full object-contain"
              alt="Original"
            />
            <div
              v-else
              class="flex flex-col items-center justify-center h-full text-ink-300 text-sm gap-1"
            >
              <span class="text-2xl">🖼️</span>
              <span class="text-xs">Bild hierher ziehen</span>
            </div>
          </div>
          <div
            v-if="selectedPair.original_filename"
            class="grid grid-cols-3 gap-2"
          >
            <button
              class="btn-ghost !py-2 text-xs"
              @click="openCropperForPair(selectedPair, 'original')"
            >
              ✏️ Zuschneiden
            </button>
            <button
              class="btn-ghost !py-2 text-xs"
              @click="replaceImage(selectedPair, 'original')"
            >
              ↺ Ersetzen
            </button>
            <button
              class="btn-danger !py-2 text-xs"
              @click="deleteOriginal(selectedPair)"
            >
              Löschen
            </button>
          </div>
          <button
            v-else
            class="btn-ghost w-full !py-2 text-xs"
            @click="replaceImage(selectedPair, 'original')"
          >
            📁 Hochladen
          </button>
        </div>

        <!-- Gemälde -->
        <div class="card space-y-3">
          <p class="text-xs font-medium uppercase tracking-wide text-ink-400">
            Gemälde (rechts)
          </p>
          <div
            class="rounded-xl overflow-hidden transition-colors"
            :class="
              dragOverPairPainted
                ? 'ring-2 ring-pink-400 bg-pink-50'
                : 'bg-ink-100'
            "
            style="aspect-ratio: 4/3"
            @dragover.prevent="dragOverPairPainted = true"
            @dragleave="dragOverPairPainted = false"
            @drop="onDropPair($event, 'painted')"
          >
            <img
              v-if="selectedPair.painted_filename"
              :src="`/api/uploads/${selectedPair.painted_filename}`"
              class="w-full h-full object-contain"
              alt="Gemälde"
            />
            <div
              v-else
              class="flex flex-col items-center justify-center h-full text-ink-300 text-sm gap-1"
            >
              <span class="text-2xl">🖼️</span>
              <span class="text-xs">Bild hierher ziehen</span>
            </div>
          </div>
          <div
            v-if="selectedPair.painted_filename"
            class="grid grid-cols-3 gap-2"
          >
            <button
              class="btn-ghost !py-2 text-xs"
              @click="openCropperForPair(selectedPair, 'painted')"
            >
              ✏️ Zuschneiden
            </button>
            <button
              class="btn-ghost !py-2 text-xs"
              @click="replaceImage(selectedPair, 'painted')"
            >
              ↺ Ersetzen
            </button>
            <button
              class="btn-danger !py-2 text-xs"
              @click="deletePainted(selectedPair)"
            >
              Löschen
            </button>
          </div>
          <button
            v-else
            class="btn-ghost w-full !py-2 text-xs"
            @click="replaceImage(selectedPair, 'painted')"
          >
            📁 Hochladen
          </button>
        </div>
      </div>
    </template>

    <!-- ── CROPPER MODAL ───────────────────────────────────────────────────── -->
    <ImageCropper
      v-model="cropperOpen"
      :image-url="cropperImageUrl"
      :title="
        cropperMode === 'original'
          ? 'Original zuschneiden'
          : 'Gemälde zuschneiden'
      "
      @crop="onCropperDone"
    />
  </div>
</template>
