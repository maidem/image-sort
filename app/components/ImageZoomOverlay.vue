<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

interface Props {
  src: string;
  alt?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

// ── Zoom ──────────────────────────────────────────────────────────────────────
const zoom = ref(1);
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

// ── Pan ───────────────────────────────────────────────────────────────────────
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const panStartX = ref(0);
const panStartY = ref(0);

function clampPan(z: number) {
  // When zoom resets to 1, snap pan back to center
  if (z <= 1) {
    panX.value = 0;
    panY.value = 0;
  }
}

watch(zoom, (z) => clampPan(z));

function onMouseDown(e: MouseEvent) {
  if (zoom.value <= 1) return;
  isPanning.value = true;
  panStartX.value = e.clientX - panX.value;
  panStartY.value = e.clientY - panY.value;
}

function onMouseMove(e: MouseEvent) {
  if (!isPanning.value) return;
  panX.value = e.clientX - panStartX.value;
  panY.value = e.clientY - panStartY.value;
}

function onMouseUp() {
  isPanning.value = false;
}

// Touch pan
function onTouchStart(e: TouchEvent) {
  if (zoom.value <= 1) return;
  isPanning.value = true;
  panStartX.value = e.touches[0].clientX - panX.value;
  panStartY.value = e.touches[0].clientY - panY.value;
}

function onTouchMove(e: TouchEvent) {
  if (!isPanning.value) return;
  panX.value = e.touches[0].clientX - panStartX.value;
  panY.value = e.touches[0].clientY - panStartY.value;
}

function onTouchEnd() {
  isPanning.value = false;
}

// Scroll wheel zoom
function onWheel(e: WheelEvent) {
  e.preventDefault();
  zoom.value = Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, zoom.value - e.deltaY * 0.005),
  );
}

// Keyboard
useEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Escape") emit("close");
  if (e.key === "+" || e.key === "=")
    zoom.value = Math.min(MAX_ZOOM, zoom.value + 0.25);
  if (e.key === "-") zoom.value = Math.max(MIN_ZOOM, zoom.value - 0.25);
});

function reset() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

// ── Zoom display ──────────────────────────────────────────────────────────────
const zoomPercent = computed(() => Math.round(zoom.value * 100));

const cursorClass = computed(() =>
  zoom.value > 1
    ? isPanning.value
      ? "cursor-grabbing"
      : "cursor-grab"
    : "cursor-default",
);
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex flex-col bg-black/95"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel.prevent="onWheel"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <!-- Header bar -->
      <div class="flex items-center justify-between px-4 py-3 shrink-0">
        <span class="text-white/50 text-sm select-none">
          {{ alt || "Original" }}
        </span>
        <div class="flex items-center gap-3">
          <!-- Zoom percent badge -->
          <span class="text-white/40 text-xs tabular-nums select-none">
            {{ zoomPercent }}%
          </span>
          <!-- Reset -->
          <button
            class="text-white/50 hover:text-white text-xs transition px-2 py-1 rounded hover:bg-white/10"
            title="Zoom zurücksetzen (1:1)"
            @click="reset"
          >
            1:1
          </button>
          <!-- Close -->
          <button
            class="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition text-xl"
            title="Schließen (Esc)"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Image stage -->
      <div
        class="flex-1 overflow-hidden flex items-center justify-center"
        :class="cursorClass"
        @mousedown="onMouseDown"
        @touchstart.prevent="onTouchStart"
        @click.self="emit('close')"
      >
        <img
          :src="src"
          :alt="alt || 'Original'"
          draggable="false"
          class="object-contain max-w-full max-h-full select-none pointer-events-none transition-transform duration-150 ease-out"
          :style="{
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
          }"
        />
      </div>

      <!-- Zoom slider bar -->
      <div class="shrink-0 px-6 py-4 flex items-center gap-4">
        <!-- Minus icon -->
        <button
          class="text-white/60 hover:text-white transition text-lg select-none w-8 h-8 flex items-center justify-center"
          aria-label="Zoom verringern"
          @click="zoom = Math.max(MIN_ZOOM, zoom - 0.25)"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <path
              d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
            <path d="M7 9h5v1H7z" />
          </svg>
        </button>

        <!-- Slider -->
        <div class="flex-1 relative flex items-center">
          <input
            v-model.number="zoom"
            type="range"
            :min="MIN_ZOOM"
            :max="MAX_ZOOM"
            step="0.05"
            class="zoom-slider w-full"
            aria-label="Zoom"
          />
        </div>

        <!-- Plus icon -->
        <button
          class="text-white/60 hover:text-white transition text-lg select-none w-8 h-8 flex items-center justify-center"
          aria-label="Zoom erhöhen"
          @click="zoom = Math.min(MAX_ZOOM, zoom + 0.25)"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
            <path
              d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
            <path d="M12 7h-1.5v1.5H9v1h1.5V11H12v-1.5h1.5V8.5H12z" />
          </svg>
        </button>
      </div>

      <!-- Keyboard hint -->
      <div
        class="absolute bottom-16 right-4 text-white/25 text-xs text-right hidden sm:block pointer-events-none select-none"
      >
        <p>+ / − Tastatur</p>
        <p>Mausrad = Zoom</p>
        <p>ESC = Schließen</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Custom range slider */
.zoom-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  transition: transform 0.1s;
}

.zoom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.zoom-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

/* Filled track (progress) via background gradient */
.zoom-slider {
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.7) calc((v-bind(zoom) - 1) / (5 - 1) * 100%),
    rgba(255, 255, 255, 0.2) calc((v-bind(zoom) - 1) / (5 - 1) * 100%),
    rgba(255, 255, 255, 0.2) 100%
  );
}
</style>
