import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sitemap from 'vite-plugin-sitemap'
import { TOOL_ROUTES } from './src/lib/routes'
import { LOCALES, DEFAULT_LOCALE } from './src/i18n/config'

const allRoutes = [
  '/',
  ...TOOL_ROUTES,
  ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((locale) => [
    `/${locale}`,
    ...TOOL_ROUTES.map((r) => `/${locale}${r}`),
  ]),
]

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sitemap({
      hostname: 'https://tools.dondone.dev',
      dynamicRoutes: allRoutes,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        inline: ['hash-wasm'],
      },
    },
  },
})
