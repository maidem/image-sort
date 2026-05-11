<script setup lang="ts">
import type { Category, ImagePair } from "~/../../types/models";

const { data: categories } =
  await useFetch<(Category & { image_count: number })[]>("/api/categories");
const { data: allPairs } = await useFetch<ImagePair[]>("/api/image-pairs");

const selectedCategory = ref<number | null>(null);
const lightboxPair = ref<ImagePair | null>(null);

// Sort categories by sort_order
const sortedCategories = computed(() => {
  if (!categories.value) return [];
  return [...categories.value].sort(
    (a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0),
  );
});

const visiblePairs = computed(() => {
  if (!allPairs.value) return [];
  const pairs =
    selectedCategory.value === null
      ? allPairs.value
      : allPairs.value.filter((p) => p.category_id === selectedCategory.value);
  return pairs.filter((p) => p.painted_filename);
});

function openLightbox(pair: ImagePair) {
  lightboxPair.value = pair;
}

function closeLightbox() {
  lightboxPair.value = null;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Category filter -->
    <div v-if="categories?.length" class="flex flex-wrap gap-2">
      <button
        class="btn"
        :class="selectedCategory === null ? 'btn-primary' : 'btn-ghost'"
        @click="selectedCategory = null"
      >
        Alle
      </button>
      <button
        v-for="c in sortedCategories"
        :key="c.id"
        class="btn"
        :class="selectedCategory === c.id ? 'btn-primary' : 'btn-ghost'"
        @click="selectedCategory = c.id"
      >
        {{ c.name }}
      </button>
    </div>

    <!-- Gallery grid -->
    <div
      v-if="visiblePairs.length"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
    >
      <div
        v-for="pair in visiblePairs"
        :key="pair.id"
        class="group cursor-pointer"
        @click="openLightbox(pair)"
      >
        <div class="aspect-square bg-ink-100 rounded-2xl overflow-hidden">
          <img
            :src="`/api/uploads/${pair.painted_filename}`"
            :alt="pair.description || 'Gemälde'"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div class="mt-2 px-1">
          <p v-if="pair.painted_at" class="text-xs text-ink-400">
            {{ pair.painted_at }}
          </p>
        </div>
      </div>
    </div>
    <div v-else class="py-16 text-center text-ink-400">
      <p class="text-lg">Noch keine Bilder vorhanden.</p>
    </div>

    <!-- Enhanced Lightbox -->
    <LightboxViewer
      :pair="lightboxPair"
      :all-pairs="visiblePairs"
      @close="closeLightbox"
      @update:pair="lightboxPair = $event"
    />
  </div>
</template>
