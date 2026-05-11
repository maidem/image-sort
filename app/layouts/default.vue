<script setup lang="ts">
const route = useRoute();
const { state, logout } = useAuth();
const isMobileMenuOpen = ref(false);

const allLinks = [
  { to: "/", label: "Pläne", adminOnly: false },
  { to: "/trainers", label: "Trainer", adminOnly: true },
  { to: "/groups", label: "Gruppen", adminOnly: true },
  { to: "/locations", label: "Standorte", adminOnly: true },
  { to: "/labels", label: "Labels", adminOnly: true },
];

const links = computed(() =>
  allLinks.filter((l) => !l.adminOnly || state.value.isAdmin),
);

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);

watch(
  isMobileMenuOpen,
  (open) => {
    if (!import.meta.client) return;
    document.body.style.overflow = open ? "hidden" : "";
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.body.style.overflow = "";
});

async function doLogout() {
  await logout();
  isMobileMenuOpen.value = false;
  navigateTo("/");
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-ink-50">
    <header
      class="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-ink-200"
    >
      <div
        class="mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:h-16 flex items-center justify-between gap-2"
      >
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <img
            src="~/assets/images/logo_axel_mueller_taekwondo_schwarz_transparent.webp"
            alt="Taekwondo Müller Logo"
            class="h-10 w-auto"
          />
        </NuxtLink>

        <button
          class="btn-ghost !inline-flex md:!hidden !px-2.5 !py-2"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="mobile-nav"
          aria-label="Navigation öffnen"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <svg
            v-if="!isMobileMenuOpen"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <nav class="hidden md:!flex items-center gap-1 flex-wrap justify-end">
          <NuxtLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="px-3 py-1.5 rounded-lg text-sm transition"
            :class="
              route.path === l.to ||
              (l.to !== '/' && route.path.startsWith(l.to))
                ? 'bg-ink-900 text-white'
                : 'text-ink-700 hover:bg-ink-100'
            "
          >
            {{ l.label }}
          </NuxtLink>
          <span
            class="mx-1 sm:mx-2 h-5 w-px bg-ink-200 hidden sm:inline-block"
          ></span>
          <template v-if="state.isAdmin">
            <span class="chip-lime mr-1">Admin</span>
            <button class="btn-ghost text-xs" @click="doLogout">Logout</button>
          </template>
          <NuxtLink v-else to="/login" class="btn-ghost text-xs">
            Admin-Login
          </NuxtLink>
        </nav>
      </div>

      <Teleport to="body">
        <div
          v-if="isMobileMenuOpen"
          id="mobile-nav"
          class="md:hidden fixed inset-0 z-50"
          @click.self="isMobileMenuOpen = false"
        >
          <div class="absolute inset-0 bg-ink-950/45"></div>
          <div class="absolute inset-0 bg-white shadow-2xl flex flex-col">
            <div
              class="h-16 px-4 border-b border-ink-100 flex items-center justify-between"
            >
              <div class="text-sm font-semibold text-ink-900">Menü</div>
              <button
                class="btn-ghost !px-2.5 !py-2"
                aria-label="Navigation schließen"
                @click="isMobileMenuOpen = false"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="h-5 w-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              <NuxtLink
                v-for="l in links"
                :key="`m-${l.to}`"
                :to="l.to"
                class="block px-3 py-3 rounded-lg text-base transition"
                :class="
                  route.path === l.to ||
                  (l.to !== '/' && route.path.startsWith(l.to))
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-700 hover:bg-ink-100'
                "
                @click="isMobileMenuOpen = false"
              >
                {{ l.label }}
              </NuxtLink>
            </div>

            <div
              class="px-4 py-4 border-t border-ink-100 flex items-center justify-between gap-2"
            >
              <span v-if="state.isAdmin" class="chip-lime">Admin</span>
              <span v-else class="text-xs text-ink-500">Nicht eingeloggt</span>

              <button
                v-if="state.isAdmin"
                class="btn-ghost text-xs"
                @click="doLogout"
              >
                Logout
              </button>
              <NuxtLink
                v-else
                to="/login"
                class="btn-ghost text-xs"
                @click="isMobileMenuOpen = false"
              >
                Admin-Login
              </NuxtLink>
            </div>
          </div>
        </div>
      </Teleport>
    </header>

    <main class="flex-1">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <slot />
      </div>
    </main>

    <footer
      class="border-t border-ink-200 py-6 text-center text-xs text-ink-500"
    >
      Trainerbelegungsplan · Taekwondo Müller · {{ new Date().getFullYear() }}
    </footer>
  </div>
</template>
