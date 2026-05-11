<script setup lang="ts">
const route = useRoute();
const planId = computed(() => Number(route.params.id));

const { state: auth } = useAuth();
const { data: plan, refresh } = await useFetch<any>(
  () => `/api/plans/${planId.value}`,
);
const planRef = computed(() => plan.value || null);
const { data: trainers, refresh: refreshTrainers } =
  await useFetch<any[]>("/api/trainers");
const trainersRef = ref(trainers || []);
const { data: groups, refresh: refreshGroups } =
  await useFetch<any[]>("/api/groups");
const groupsRef = ref(groups || []);
const { data: locations, refresh: refreshLocations } =
  await useFetch<any[]>("/api/locations");
const locationsRef = ref(locations || []);
const { data: labels, refresh: refreshLabels } =
  await useFetch<any[]>("/api/labels");
const labelsRef = ref(labels || []);

// Auto-sync with live updates and fallback refreshes
useSyncData(trainersRef, "trainers", "id", refreshTrainers);
useSyncData(groupsRef, "groups", "id", refreshGroups);
useSyncData(locationsRef, "locations", "id", refreshLocations);
useSyncData(labelsRef, "labels", "id", refreshLabels);

// Sync slots updates
const { on: onRealtime } = useRealtime();
const realtimeCleanups: Array<() => void> = [];
let planRefreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  realtimeCleanups.push(
    onRealtime("slots:created", async () => {
      if (planRef.value && planRef.value.id === planId.value) {
        await refresh();
      }
    }),
    onRealtime("slots:updated", async () => {
      if (planRef.value && planRef.value.id === planId.value) {
        await refresh();
      }
    }),
    onRealtime("slots:deleted", async () => {
      if (planRef.value && planRef.value.id === planId.value) {
        await refresh();
      }
    }),
    onRealtime("checkin:created", async () => {
      if (planRef.value && planRef.value.id === planId.value) {
        await refresh();
      }
    }),
    onRealtime("checkin:deleted", async () => {
      if (planRef.value && planRef.value.id === planId.value) {
        await refresh();
      }
    }),
  );

  planRefreshTimer = setInterval(() => {
    void refresh();
  }, 5000);
});

onUnmounted(() => {
  for (const cleanup of realtimeCleanups.splice(0)) {
    cleanup();
  }

  if (planRefreshTimer) {
    clearInterval(planRefreshTimer);
    planRefreshTimer = null;
  }
});

const monthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// Build calendar days for the month
const days = computed(() => {
  if (!planRef.value) return [];
  const { year, month } = planRef.value;
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => {
    const d = i + 1;
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return {
      day: d,
      iso,
      weekday: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });
});

// Location filter
const filterLocationId = ref<number | null>(null);

const filteredSlots = computed(() => {
  const slots = planRef.value?.slots || [];
  if (!filterLocationId.value) return slots;
  return slots.filter((s: any) => s.location_id === filterLocationId.value);
});

const slotsByDate = computed(() => {
  const map = new Map<string, any[]>();
  for (const s of filteredSlots.value) {
    if (!map.has(s.date)) map.set(s.date, []);
    map.get(s.date)!.push(s);
  }
  return map;
});

const daysWithSlots = computed(() => {
  if (auth.value?.isAdmin) return days.value;
  return days.value.filter((d) => slotsByDate.value.has(d.iso));
});

// Slot create / edit modal
const slotModal = ref<null | {
  mode: "create" | "edit";
  date: string;
  slot?: any;
}>(null);
const slotForm = reactive({
  start_time: "17:00",
  end_time: "18:30",
  group_id: null as number | null,
  location_id: null as number | null,
  trainer_ids: [] as number[],
  label_ids: [] as number[],
  note: "",
});

function openCreate(date: string) {
  slotForm.start_time = "17:00";
  slotForm.end_time = "18:30";
  slotForm.group_id = null;
  slotForm.location_id = null;
  slotForm.trainer_ids = [];
  slotForm.label_ids = [];
  slotForm.note = "";
  slotModal.value = { mode: "create", date };
}

function openEdit(slot: any) {
  slotForm.start_time = slot.start_time;
  slotForm.end_time = slot.end_time;
  slotForm.group_id = slot.group_id;
  slotForm.location_id = slot.location_id;
  slotForm.trainer_ids = (slot.trainers || []).map((t: any) => t.id);
  slotForm.label_ids = (slot.labels || []).map((label: any) => label.id);
  slotForm.note = slot.note || "";
  slotModal.value = { mode: "edit", date: slot.date, slot };
}

async function saveSlot() {
  if (!slotModal.value) return;
  const m = slotModal.value;
  if (m.mode === "create") {
    await $fetch(`/api/plans/${planId.value}/slots`, {
      method: "POST",
      body: { date: m.date, ...slotForm },
    });
  } else {
    await $fetch(`/api/plans/${planId.value}/slots/${m.slot.id}`, {
      method: "PATCH",
      body: { ...slotForm },
    });
  }
  slotModal.value = null;
  await refresh();
}

async function deleteSlot(slot: any) {
  if (!confirm("Slot löschen?")) return;
  await $fetch(`/api/plans/${planId.value}/slots/${slot.id}`, {
    method: "DELETE",
  });
  await refresh();
}

// Check-in modal
const checkinModal = ref<null | { slot: any }>(null);
const checkinForm = reactive({ trainer_id: null as number | null, pin: "" });
const checkinError = ref("");
const checkinTrainerOptions = computed(() => {
  const slot = checkinModal.value?.slot;
  if (!slot?.trainers?.length) return trainers.value || [];
  const unchecked = slot.trainers.filter((t: any) => !t.checked_in_at);
  return unchecked.length ? unchecked : slot.trainers;
});

function slotCheckedCount(slot: any) {
  return (slot.trainers || []).filter((t: any) => t.checked_in_at).length;
}

function slotCanCheckin(slot: any) {
  if (slot?.trainers?.length) {
    return slot.trainers.some((t: any) => !t.checked_in_at);
  }
  return !slot.checked_in_at;
}

function slotCanUndo(slot: any) {
  if (slot?.trainers?.length) {
    return slot.trainers.some((t: any) => t.checked_in_at);
  }
  return !!slot.checked_in_at;
}

function openCheckin(slot: any, trainer?: any) {
  const unchecked =
    trainer && !trainer.checked_in_at
      ? trainer
      : (slot.trainers || []).find((t: any) => !t.checked_in_at);
  checkinForm.trainer_id =
    unchecked?.id || slot.trainer_id || slot.trainers?.[0]?.id || null;
  checkinForm.pin = "";
  checkinError.value = "";
  checkinModal.value = { slot };
}

async function doCheckin() {
  if (!checkinModal.value) return;
  checkinError.value = "";
  try {
    await $fetch(
      `/api/plans/${planId.value}/slots/${checkinModal.value.slot.id}/checkin`,
      {
        method: "POST",
        body: { trainer_id: checkinForm.trainer_id, pin: checkinForm.pin },
      },
    );
    checkinModal.value = null;
    await refresh();
  } catch (e: any) {
    checkinError.value = e?.statusMessage || "Check-in fehlgeschlagen";
  }
}

// Undo-Check-in modal
const undoModal = ref<null | { slot: any }>(null);
const undoForm = reactive({ trainer_id: null as number | null, pin: "" });
const undoError = ref("");
const undoTrainerOptions = computed(() => {
  const slot = undoModal.value?.slot;
  if (!slot) return [];
  const checked = (slot.trainers || []).filter((t: any) => t.checked_in_at);
  return checked.length ? checked : slot.trainers || [];
});

function openUndo(slot: any, trainer?: any) {
  const firstChecked = trainer?.checked_in_at
    ? trainer
    : (slot.trainers || []).find((t: any) => t.checked_in_at);
  undoForm.trainer_id = firstChecked?.id || slot.trainer_id || null;
  undoForm.pin = "";
  undoError.value = "";
  undoModal.value = { slot };
}

async function doUndo() {
  if (!undoModal.value) return;
  undoError.value = "";
  try {
    await $fetch(
      `/api/plans/${planId.value}/slots/${undoModal.value.slot.id}/checkin`,
      {
        method: "DELETE",
        body: {
          trainer_id: undoForm.trainer_id,
          ...(auth.value.isAdmin ? {} : { pin: undoForm.pin }),
        },
      },
    );
    undoModal.value = null;
    await refresh();
  } catch (e: any) {
    undoError.value = e?.data?.statusMessage || e?.statusMessage || "Fehler";
  }
}

function fmtTime(s: string) {
  return s.substring(0, 5);
}

function toggleSlotTrainer(id: number) {
  const i = slotForm.trainer_ids.indexOf(id);
  if (i >= 0) slotForm.trainer_ids.splice(i, 1);
  else slotForm.trainer_ids.push(id);
}

function toggleSlotLabel(id: number) {
  const i = slotForm.label_ids.indexOf(id);
  if (i >= 0) slotForm.label_ids.splice(i, 1);
  else slotForm.label_ids.push(id);
}
</script>

<template>
  <section v-if="plan" class="space-y-6">
    <div class="flex items-start justify-between flex-wrap gap-4">
      <div class="min-w-0 flex-1">
        <NuxtLink to="/" class="text-sm text-ink-500 hover:text-ink-900"
          >← Alle Pläne</NuxtLink
        >
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight mt-2">
          {{ monthNames[plan.month - 1] }} {{ plan.year }}
        </h1>
        <p v-if="plan.title" class="text-ink-500 mt-1">{{ plan.title }}</p>
      </div>
    </div>

    <!-- Filter by location -->
    <div v-if="locations?.length" class="space-y-2">
      <span class="block text-xs text-ink-500">Standort:</span>
      <div
        class="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 whitespace-nowrap scrollbar-none"
      >
        <button
          class="chip text-xs flex-shrink-0"
          :class="
            !filterLocationId ? '!bg-ink-900 !text-white !border-ink-900' : ''
          "
          @click="filterLocationId = null"
        >
          Alle
        </button>
        <button
          v-for="loc in locations"
          :key="loc.id"
          class="chip text-xs flex-shrink-0"
          :class="
            filterLocationId === loc.id
              ? '!bg-ink-900 !text-white !border-ink-900'
              : ''
          "
          @click="
            filterLocationId = filterLocationId === loc.id ? null : loc.id
          "
        >
          {{ loc.name }}
        </button>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="d in daysWithSlots"
        :key="d.iso"
        class="card !p-0 overflow-hidden"
        :class="d.isWeekend ? 'bg-ink-50/60' : ''"
      >
        <div
          class="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-ink-100 gap-2"
        >
          <div class="flex items-baseline gap-2 sm:gap-3 min-w-0">
            <span
              class="text-xs uppercase tracking-wider text-ink-500 w-6 flex-shrink-0"
              >{{ d.weekday }}</span
            >
            <span
              class="text-lg sm:text-xl font-semibold tabular-nums flex-shrink-0"
              >{{ d.day }}</span
            >
            <span class="hidden sm:inline text-xs text-ink-400">{{
              d.iso
            }}</span>
          </div>
          <button
            v-if="auth.isAdmin"
            class="btn-ghost text-sm sm:text-xs min-h-9 px-3 flex-shrink-0"
            @click="openCreate(d.iso)"
          >
            + Slot
          </button>
        </div>

        <div class="divide-y divide-ink-100">
          <div
            v-for="s in slotsByDate.get(d.iso)"
            :key="s.id"
            class="px-4 sm:px-5 py-3 flex flex-col gap-2 hover:bg-ink-50/60 transition"
          >
            <!-- Zeit und Buttons Row (responsive) -->
            <div class="flex items-start justify-between gap-2">
              <div
                class="font-mono text-sm font-medium tabular-nums text-ink-700 flex-shrink-0"
              >
                {{ fmtTime(s.start_time) }}–{{ fmtTime(s.end_time) }}
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button
                  v-if="auth.isAdmin"
                  class="btn-ghost text-sm sm:text-xs min-h-9 min-w-9"
                  @click="openEdit(s)"
                  title="Bearbeiten"
                >
                  ✎
                </button>
                <button
                  v-if="auth.isAdmin"
                  class="btn-danger text-sm sm:text-xs min-h-9 min-w-9"
                  @click="deleteSlot(s)"
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Gruppe + Standort -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-ink-500 text-xs w-16 flex-shrink-0"
                  >Gruppe:</span
                >
                <span
                  v-if="s.group_name"
                  class="text-xs font-medium truncate flex-1"
                  >{{ s.group_name }}</span
                >
                <span v-else class="text-ink-400 italic text-xs">keine</span>
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-ink-500 text-xs w-16 flex-shrink-0"
                  >Standort:</span
                >
                <span
                  v-if="s.location_name"
                  class="text-xs font-medium truncate flex-1"
                  >{{ s.location_name }}</span
                >
                <span v-else class="text-ink-400 italic text-xs">keiner</span>
              </div>
            </div>

            <div v-if="s.labels?.length" class="flex items-start gap-2">
              <span class="text-ink-500 text-xs w-16 flex-shrink-0 mt-0.5"
                >Labels:</span
              >
              <div class="flex flex-wrap gap-1.5 flex-1 min-w-0">
                <span
                  v-for="label in s.labels"
                  :key="label.id"
                  class="chip-label chip-wrap text-xs"
                >
                  {{ label.name }}
                </span>
              </div>
            </div>

            <!-- Trainer (scrollbar auf Mobile) -->
            <div class="flex items-start gap-2">
              <span class="text-ink-500 text-xs w-16 flex-shrink-0 mt-0.5"
                >Trainer:</span
              >
              <div
                v-if="s.trainers?.length"
                class="flex flex-wrap gap-1.5 flex-1 min-w-0"
              >
                <span
                  v-for="t in s.trainers"
                  :key="t.id"
                  class="chip cursor-pointer select-none text-xs"
                  :class="
                    t.checked_in_at ? 'chip-checked' : 'hover:border-ink-400'
                  "
                  :title="
                    t.checked_in_at
                      ? 'Klicken zum Auschecken'
                      : 'Klicken zum Einchecken'
                  "
                  @click="t.checked_in_at ? openUndo(s, t) : openCheckin(s, t)"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full dot-pulse"
                    :style="{ background: t.color }"
                  ></span>
                  <span class="whitespace-nowrap">{{ t.name }}</span>
                </span>
              </div>
              <span v-else class="text-xs text-ink-400">keine</span>
            </div>

            <!-- Notiz (falls vorhanden) -->
            <div v-if="s.note" class="flex items-start gap-2">
              <span class="text-ink-500 text-xs w-16 flex-shrink-0 mt-0.5"
                >Notiz:</span
              >
              <span class="text-xs text-ink-600 break-words flex-1">{{
                s.note
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slot Modal -->
    <div
      v-if="slotModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      @click.self="slotModal = null"
    >
      <div class="card w-full max-w-md mx-4 flex flex-col max-h-[90dvh]">
        <h2
          class="text-lg font-semibold flex-shrink-0 pb-3 border-b border-ink-100"
        >
          {{ slotModal.mode === "create" ? "Slot anlegen" : "Slot bearbeiten" }}
          <span class="text-sm font-normal text-ink-500"
            >· {{ slotModal.date }}</span
          >
        </h2>
        <div class="flex-1 overflow-y-auto space-y-4 py-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Start</label>
              <input v-model="slotForm.start_time" type="time" class="input" />
            </div>
            <div>
              <label class="label">Ende</label>
              <input v-model="slotForm.end_time" type="time" class="input" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Gruppe</label>
              <select v-model.number="slotForm.group_id" class="select">
                <option :value="null">— keine —</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">
                  {{ g.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">Standort</label>
              <select v-model.number="slotForm.location_id" class="select">
                <option :value="null">— keiner —</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Trainer (Mehrfachauswahl)</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="t in trainers"
                :key="t.id"
                type="button"
                class="chip"
                :aria-label="`Trainer ${t.name} zuordnen`"
                :aria-pressed="slotForm.trainer_ids.includes(t.id)"
                :class="
                  slotForm.trainer_ids.includes(t.id)
                    ? '!bg-ink-900 !text-white !border-ink-900'
                    : ''
                "
                @click="toggleSlotTrainer(t.id)"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{ background: t.color }"
                ></span>
                {{ t.name }}
              </button>
            </div>
          </div>
          <div>
            <label class="label">Labels</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="label in labelsRef"
                :key="label.id"
                type="button"
                class="chip-label chip-wrap"
                :aria-label="`Label ${label.name} zuordnen`"
                :aria-pressed="slotForm.label_ids.includes(label.id)"
                :class="
                  slotForm.label_ids.includes(label.id)
                    ? '!bg-[color:var(--color-lime-vivid)] !text-ink-950 !border-[color:var(--color-lime-deep)]/40'
                    : ''
                "
                @click="toggleSlotLabel(label.id)"
              >
                {{ label.name }}
              </button>
            </div>
          </div>
          <div>
            <label class="label">Notiz</label>
            <input v-model="slotForm.note" class="input" />
          </div>
        </div>
        <div
          class="grid grid-cols-2 gap-2 pt-3 border-t border-ink-100 flex-shrink-0 sm:flex sm:justify-end"
        >
          <button class="btn-ghost" @click="slotModal = null">Abbrechen</button>
          <button class="btn-primary" @click="saveSlot">Speichern</button>
        </div>
      </div>
    </div>

    <!-- Check-in Modal -->
    <div
      v-if="checkinModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      @click.self="checkinModal = null"
    >
      <div class="card w-full max-w-sm mx-4 space-y-4">
        <h2 class="text-lg font-semibold">Trainer Check-in</h2>
        <p class="text-sm text-ink-500">
          {{ checkinModal.slot.date }} ·
          {{ fmtTime(checkinModal.slot.start_time) }}–{{
            fmtTime(checkinModal.slot.end_time)
          }}
          <span v-if="checkinModal.slot.group_name">
            · {{ checkinModal.slot.group_name }}</span
          >
        </p>
        <div>
          <label class="label">Trainer</label>
          <select v-model.number="checkinForm.trainer_id" class="select">
            <option :value="null">— wählen —</option>
            <option
              v-for="t in checkinTrainerOptions"
              :key="t.id"
              :value="t.id"
            >
              {{ t.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">PIN</label>
          <input
            v-model="checkinForm.pin"
            type="password"
            inputmode="numeric"
            class="input"
            placeholder="••••"
            autofocus
          />
        </div>
        <div v-if="checkinError" class="text-sm text-red-600">
          {{ checkinError }}
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
          <button class="btn-ghost" @click="checkinModal = null">
            Abbrechen
          </button>
          <button class="btn-lime" @click="doCheckin">Einchecken</button>
        </div>
      </div>
    </div>

    <!-- Undo Check-in Modal -->
    <div
      v-if="undoModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      @click.self="undoModal = null"
    >
      <div class="card w-full max-w-sm mx-4 space-y-4">
        <h2 class="text-lg font-semibold">Check-in rückgängig</h2>
        <p class="text-sm text-ink-500">
          {{ undoModal.slot.date }} ·
          {{ fmtTime(undoModal.slot.start_time) }}–{{
            fmtTime(undoModal.slot.end_time)
          }}
          <span v-if="undoModal.slot.group_name">
            · {{ undoModal.slot.group_name }}</span
          >
        </p>
        <div>
          <label class="label">Trainer</label>
          <select v-model.number="undoForm.trainer_id" class="select">
            <option :value="null">— wählen —</option>
            <option v-for="t in undoTrainerOptions" :key="t.id" :value="t.id">
              {{ t.name }}
            </option>
          </select>
        </div>
        <div v-if="!auth.isAdmin">
          <label class="label">PIN bestätigen</label>
          <input
            v-model="undoForm.pin"
            type="password"
            inputmode="numeric"
            class="input"
            placeholder="••••"
            autofocus
          />
        </div>
        <div v-if="undoError" class="text-sm text-red-600">
          {{ undoError }}
        </div>
        <div class="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
          <button class="btn-ghost" @click="undoModal = null">Abbrechen</button>
          <button class="btn-danger" @click="doUndo">Auschecken</button>
        </div>
      </div>
    </div>
  </section>
</template>
