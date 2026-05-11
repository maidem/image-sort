<script setup lang="ts">
import faviconUrl from "~/assets/images/icon_axel_mueller_taekwondo_transparent.webp";

useHead({
  link: [{ rel: "icon", type: "image/webp", href: faviconUrl }],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
