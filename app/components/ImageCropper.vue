<script setup lang="ts">
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

interface Props {
  modelValue: boolean;
  imageUrl: string | null;
  title: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  crop: [blob: Blob];
}>();

const cropper = ref<InstanceType<typeof Cropper>>();

function crop() {
  if (!cropper.value) return;
  const canvas = cropper.value.getCanvas();
  canvas?.toBlob((blob) => {
    if (blob) {
      emit("crop", blob);
      close();
    }
  });
}

function close() {
  emit("update:modelValue", false);
}

function rotateLeft() {
  cropper.value?.rotate(-90);
}

function rotateRight() {
  cropper.value?.rotate(90);
}

function flipX() {
  cropper.value?.flip(true, false);
}

function flipY() {
  cropper.value?.flip(false, true);
}

function zoomIn() {
  cropper.value?.zoom(1.25);
}

function zoomOut() {
  cropper.value?.zoom(0.8);
}

function reset() {
  cropper.value?.reset();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style="max-height: 90vh"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-ink-200 flex-shrink-0"
        >
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            class="text-ink-400 hover:text-ink-900 text-xl"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- Cropper area -->
        <div class="bg-ink-900 flex-shrink-0" style="height: min(420px, 50vh)">
          <Cropper
            v-if="imageUrl"
            ref="cropper"
            :src="imageUrl"
            :stencil-props="{ grid: true }"
            class="w-full h-full"
          />
        </div>

        <!-- Controls -->
        <div class="p-3 sm:p-4 border-t border-ink-200 flex-shrink-0 space-y-3">
          <div
            class="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap sm:gap-2 sm:justify-center"
          >
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="zoomOut"
            >
              🔍−
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="zoomIn"
            >
              🔍+
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="rotateLeft"
            >
              ↶
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="rotateRight"
            >
              ↷
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="flipX"
            >
              ↔
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2"
              @click="flipY"
            >
              ↕
            </button>
            <button
              type="button"
              class="btn-ghost text-xs !px-2 col-span-2 sm:col-span-1"
              @click="reset"
            >
              ↺ Reset
            </button>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-lime flex-1" @click="crop">
              Zuschnitt speichern
            </button>
            <button type="button" class="btn-ghost flex-1" @click="close">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
