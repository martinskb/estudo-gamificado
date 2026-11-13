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
        name: 'Estudo',
        short_name: 'Estudo',
        description: 'Organize seus estudos: cronômetro, ofensiva e trilhas com aulas gratuitas.',
        lang: 'pt-BR',
        display: 'standalone',
        start_url: '/',
        background_color: '#f6f6f4',
        theme_color: '#2f6f4f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
