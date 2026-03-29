import inertia from '@inertiajs/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import RubyPlugin from 'vite-plugin-ruby'

export default defineConfig({
  plugins: [
    inertia(),
    react(),
    tailwindcss(),
    RubyPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3036,
    hmr: {
      host: 'localhost',
      port: 3036,
    },
  },
})
