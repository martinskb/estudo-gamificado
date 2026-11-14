import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Só os arquivos do site ficam em cache; chamadas à API nunca.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], navigateFallback: '/index.html' },
      manifest: {
        name: 'Lume',
        short_name: 'Lume',
        description: 'Organize seus estudos com aulas gratuitas, cronômetro e ofensiva.',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        background_color: '#f4f3fb',
        theme_color: '#3d3bb8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
