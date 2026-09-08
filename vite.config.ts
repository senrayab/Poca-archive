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
  // 설정 화면에서 '지금 보고 있는 화면이 언제 것인지' 보여주는 데 쓴다
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 큰 아이콘은 설치할 때 운영체제가 직접 받아가므로 캐시에 담지 않는다.
      // 작은 둘만 담아 오프라인에서도 탭 아이콘과 홈 화면 아이콘이 나오게 한다.
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: '포토카드 아카이브',
        short_name: 'POCA',
        description: '소장 중인 포토카드를 썸네일로 모아보는 아카이브',
        lang: 'ko',
        theme_color: '#0f0e14',
        background_color: '#0f0e14',
        display: 'standalone',
        orientation: 'portrait',
        // start_url/scope는 vite-plugin-pwa가 base에서 채운다.
        // 여기서 '/'로 고정하면 설치된 앱이 도메인 루트를 열어버린다.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          /*
           * 안드로이드 런처는 이 그림을 제 모양(원·둥근 네모 등)으로 잘라낸다.
           * 그래서 마스커블 쪽만 그림을 안쪽 74%에 두고 둘레를 옅은 색으로 채웠다 —
           * 어떻게 잘려도 카드와 얼굴이 잘려 나가지 않는다.
           */
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
}))
