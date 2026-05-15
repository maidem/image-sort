<script setup lang="ts">
import type { Category, ImagePair } from "~/../../types/models";
import Sortable from "sortablejs";

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

// ─── Pair reorder (SortableJS) ───────────────────────────────────────────────
const localPairs = ref<ImagePair[]>([]);
const pairGrid = ref<HTMLElement | null>(null);
let sortableInstance: Sortable | null = null;

watch(
  categoryPairs,
  (p) => {
    localPairs.value = [...p];
  },
  { immediate: true },
);

watch(pairGrid, (el) => {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
  if (!el) return;
  sortableInstance = Sortable.create(el, {
    animation: 150,
    ghostClass: "opacity-40",
    dragClass: "scale-105",
    filter: ".no-drag",
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      const items = [...localPairs.value];
      const [moved] = items.splice(evt.oldIndex!, 1);
      items.splice(evt.newIndex!, 0, moved);
      localPairs.value = items;
      try {
        await $fetch("/api/image-pairs/reorder", {
          method: "POST",
          body: items.map((p, i) => ({ id: p.id, sort_order: i })),
        });
      } catch {
        await refresh();
      }
    },
  });
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
const uploading = ref(false);
const uploadError = ref("");

// ─── Cropper ─────────────────────────────────────────────────────────────────
const cropperOpen = ref(false);
const cropperImageUrl = ref<string | null>(null);
const cropperMode = ref<"original" | "painted" | null>(null);
const cropperPairId = ref<number | null>(null);

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
  if (file) uploadFile(file, "original");
}

function onPainted(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) uploadFile(file, "painted");
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
  uploadFile(file, slot);
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
  if (cropperPairId.value === null) return;
  const file = new File([blob], `${cropperMode.value}-${Date.now()}.png`, {
    type: "image/png",
  });
  const fd = new FormData();
  fd.append(cropperMode.value!, file);
  await $fetch(`/api/image-pairs/${cropperPairId.value}/${cropperMode.value}`, {
    method: "POST",
    body: fd,
  });
  await refresh();
  cropperOpen.value = false;
  cropperImageUrl.value = null;
  cropperMode.value = null;
  cropperPairId.value = null;
}

// ─── Upload ───────────────────────────────────────────────────────────────────
async function uploadFile(file: File, slot: "original" | "painted") {
  if (uploading.value || !uploadCategoryId.value) return;
  uploading.value = true;
  uploadError.value = "";
  try {
    const fd = new FormData();
    fd.append("category_id", String(uploadCategoryId.value));
    fd.append(slot, file);
    await $fetch("/api/image-pairs", { method: "POST", body: fd });
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

// ─── Zoom overlay ─────────────────────────────────────────────────────────────
const zoomOverlayOpen = ref(false);
const zoomOverlaySrc = ref("");
const zoomOverlayAlt = ref("");

function openZoom(src: string, alt: string) {
  zoomOverlaySrc.value = src;
  zoomOverlayAlt.value = alt;
  zoomOverlayOpen.value = true;
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
      <div v-if="showUpload" class="card space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <label
            class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
            style="aspect-ratio: 3/4"
            :class="
              dragOverOriginal
                ? 'border-pink-400 bg-pink-50'
                : uploading
                  ? 'border-ink-200 bg-ink-50 opacity-50 pointer-events-none'
                  : 'border-ink-200 bg-ink-50 hover:border-pink-300'
            "
            @dragover.prevent="dragOverOriginal = true"
            @dragleave="dragOverOriginal = false"
            @drop="onDropUpload($event, 'original')"
          >
            <span class="text-3xl">🖼️</span>
            <span class="text-xs text-ink-500 font-medium">Original</span>
            <span class="text-xs text-ink-400 text-center px-3"
              >Ziehen oder klicken</span
            >
            <input
              type="file"
              accept="image/*"
              class="hidden"
              @change="onOriginal"
            />
          </label>
          <label
            class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
            style="aspect-ratio: 3/4"
            :class="
              dragOverPainted
                ? 'border-pink-400 bg-pink-50'
                : uploading
                  ? 'border-ink-200 bg-ink-50 opacity-50 pointer-events-none'
                  : 'border-ink-200 bg-ink-50 hover:border-pink-300'
            "
            @dragover.prevent="dragOverPainted = true"
            @dragleave="dragOverPainted = false"
            @drop="onDropUpload($event, 'painted')"
          >
            <span class="text-3xl">🎨</span>
            <span class="text-xs text-ink-500 font-medium">Gemälde</span>
            <span class="text-xs text-ink-400 text-center px-3"
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
        <p v-if="uploading" class="text-xs text-ink-400 text-center">
          Wird hochgeladen…
        </p>
        <p v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</p>
      </div>

      <!-- Kachel-Raster -->
      <div
        v-if="localPairs.length"
        ref="pairGrid"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        <div
          v-for="pair in localPairs"
          :key="pair.id"
          class="card !p-2 cursor-grab hover:shadow-md hover:border-pink-300 transition-all space-y-2"
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
            class="relative rounded-xl overflow-hidden transition-colors group/img"
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
            <!-- Magnifier button (only when image exists) -->
            <button
              v-if="selectedPair.original_filename"
              class="absolute top-2 left-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover/img:opacity-100 hover:bg-black/65 transition-all duration-150"
              title="Vergrößern"
              @click.stop="
                openZoom(
                  `/api/uploads/${selectedPair.original_filename}`,
                  'Original',
                )
              "
            >
              <svg
                viewBox="0 0 24 24"
                class="w-5 h-5 fill-current"
                aria-hidden="true"
              >
                <path
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
                <path d="M10 7v2H8v1h2v2h1v-2h2V9h-2V7z" />
              </svg>
            </button>
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
    <!-- Zoom overlay -->
    <ImageZoomOverlay
      v-if="zoomOverlayOpen"
      :src="zoomOverlaySrc"
      :alt="zoomOverlayAlt"
      @close="zoomOverlayOpen = false"
    />

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
