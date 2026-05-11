// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  future: { compatibilityVersion: 4 },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    // Persist DB outside the bundle in production via DATABASE_PATH
    experimental: {
      tasks: false,
    },
  },

  runtimeConfig: {
    databasePath: process.env.DATABASE_PATH || "./data/app.db",
    uploadPath: process.env.UPLOAD_PATH || "./data/uploads",
    // Admin credentials (cleartext only in env, never persisted in repo).
    // If empty, admin endpoints are DISABLED for safety.
    adminEmail: process.env.ADMIN_EMAIL || "",
    adminPassword: process.env.ADMIN_PASSWORD || "",
    // Random secret for signing the admin session cookie.
    sessionSecret: process.env.SESSION_SECRET || "",
    uploadPath: process.env.UPLOAD_PATH || "./data/uploads",
    public: {
      appName: "Image Sort",
    },
  },

  app: {
    head: {
      title: "Image Sort",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#0a0a0a" },
      ],
    },
  },
});
