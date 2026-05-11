<script setup lang="ts">
import type { ImagePair } from "~/../../types/models";
import { useEventListener } from "@vueuse/core";

interface Props {
  pair: ImagePair | null;
  allPairs: ImagePair[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const currentIndex = computed(() =>
  props.allPairs.findIndex((p) => p.id === props.pair?.id),
);

const dragX = ref(0);
const dragStartX = ref(0);
const isDragging = ref(false);
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);

function close() {
  emit("close");
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function prev() {
  if (currentIndex.value > 0) {
    const nextPair = props.allPairs[currentIndex.value - 1];
    if (nextPair?.painted_filename) {
      emit("update:pair", nextPair);
    }
  }
}

function next() {
  if (currentIndex.value < props.allPairs.length - 1) {
    const nextPair = props.allPairs[currentIndex.value + 1];
    if (nextPair?.painted_filename) {
      emit("update:pair", nextPair);
    }
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true;
  dragStartX.value = e.clientX - dragX.value;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  dragX.value = e.clientX - dragStartX.value;
}

function onMouseUp() {
  isDragging.value = false;
  if (Math.abs(dragX.value) > 50) {
    dragX.value > 0 ? prev() : next();
  }
  dragX.value = 0;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const newZoom = zoom.value - e.deltaY * 0.001;
  zoom.value = Math.max(1, Math.min(newZoom, 3));
}

useEventListener("keydown", (e: KeyboardEvent) => {
  if (!props.pair) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
});

const canGoPrev = computed(() => currentIndex.value > 0);
const canGoNext = computed(() => currentIndex.value < props.allPairs.length - 1);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="pair"
      class="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      @click.self="close"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel="onWheel"
    >
      <!-- Close button -->
      <button
        class="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10 transition"
        @click="close"
      >✕</button>

      <!-- Previous button -->
      <button
        v-if="canGoPrev"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-3xl z-10 transition"
        @click="prev"
      >‹</button>

      <!-- Image container -->
      <div
        class="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        @mousedown="onMouseDown"
      >
        <img
          :src="`/api/uploads/${pair.painted_filename}`"
          :alt="pair.description || 'Gemälde'"
          class="object-contain max-h-[90vh] max-w-[90vw] select-none pointer-events-none"
          :style="{
            transform: `scale(${zoom}) translateX(${dragX}px) translate(${panX}px, ${panY}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }"
        />
      </div>

      <!-- Next button -->
      <button
        v-if="canGoNext"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-3xl z-10 transition"
        @click="next"
      >›</button>

      <!-- Bottom info -->
      <div class="absolute bottom-4 left-0 right-0 text-center text-white/70 space-y-1">
        <p v-if="pair.description" class="text-lg">{{ pair.description }}</p>
        <p v-if="pair.painted_at" class="text-sm">Gemalt am {{ pair.painted_at }}</p>
        <p class="text-xs">{{ currentIndex + 1 }} / {{ allPairs.length }}</p>
      </div>

      <!-- Controls info -->
      <div class="absolute bottom-4 right-4 text-white/50 text-xs space-y-0.5">
        <p>← → Pfeiltasten zum Navigieren</p>
        <p>🖱 Mausrad zum Zoomen</p>
        <p>🖱 Ziehen zum Navigieren</p>
        <p>ESC zum Schließen</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
img {
  user-select: none;
}
</style>
