import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages는 https://<user>.github.io/<repo>/ 하위에서 서비스된다.
// 개발 중에는 루트를 그대로 쓰는 편이 편해서 빌드일 때만 붙인다.
const BASE = '/Poca-archive/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '포토카드 아카이브',
        short_name: 'POCA',
        description: '소장 중인 포토카드를 썸네일로 모아보는 아카이브',
        lang: 'ko',
        theme_color: '#0e0e12',
        background_color: '#0e0e12',
        display: 'standalone',
        orientation: 'portrait',
        // start_url/scope는 vite-plugin-pwa가 base에서 채운다.
        // 여기서 '/'로 고정하면 설치된 앱이 도메인 루트를 열어버린다.
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
}))
