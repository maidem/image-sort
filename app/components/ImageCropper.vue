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
const scale = ref({ x: 1, y: 1 });
const rotate = ref(0);

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

function reset() {
  rotate.value = 0;
  scale.value = { x: 1, y: 1 };
}

function close() {
  emit("update:modelValue", false);
  reset();
}

function flipX() {
  scale.value.x = -scale.value.x;
}

function flipY() {
  scale.value.y = -scale.value.y;
}

function rotateLeft() {
  rotate.value = (rotate.value - 90) % 360;
}

function rotateRight() {
  rotate.value = (rotate.value + 90) % 360;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-5 border-b border-ink-200"
        >
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            class="text-ink-400 hover:text-ink-900 text-xl"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- Cropper -->
        <div
          class="flex-1 overflow-auto flex items-center justify-center bg-ink-50 p-4"
        >
          <Cropper
            v-if="imageUrl"
            ref="cropper"
            :src="imageUrl"
            :stencil-props="{
              handlers: {},
              lines: true,
              grid: true,
            }"
            :canvas="true"
            image-restriction="stencil"
            :scale="scale"
            :rotate="rotate"
            class="w-full h-full"
          />
        </div>

        <!-- Controls -->
        <div class="p-5 border-t border-ink-200 space-y-4">
          <!-- Zoom slider -->
          <div class="space-y-2">
            <label class="label">Zoom</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              :value="cropper?.getState()?.scale || 1"
              class="w-full"
              @input="
                (e) => {
                  if (cropper)
                    cropper.setScale(
                      (e.target as HTMLInputElement).valueAsNumber,
                    );
                }
              "
            />
          </div>

          <!-- Buttons -->
          <div class="flex flex-wrap gap-2">
            <button class="btn-ghost text-sm" @click="rotateLeft">
              ↶ Rotieren
            </button>
            <button class="btn-ghost text-sm" @click="rotateRight">
              ↷ Rotieren
            </button>
            <button class="btn-ghost text-sm" @click="flipX">
              ↔ Horizontal
            </button>
            <button class="btn-ghost text-sm" @click="flipY">↕ Vertikal</button>
            <button class="btn-ghost text-sm ml-auto" @click="reset">
              Zurücksetzen
            </button>
          </div>

          <!-- Save -->
          <div class="flex gap-2">
            <button class="btn-lime flex-1" @click="crop">Speichern</button>
            <button class="btn-ghost flex-1" @click="close">Abbrechen</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
:deep(.cropper) {
  width: 100%;
  height: 100%;
}
</style>
