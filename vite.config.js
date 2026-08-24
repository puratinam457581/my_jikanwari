import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 相対パスで出力する。こうしておくと、公開先が
  //   https://例.github.io/jikannwari/  (GitHub Pages のサブパス)
  //   https://例.pages.dev/             (Cloudflare Pages のルート)
  // のどちらでも、設定を変えずにそのまま動く。
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    // PWA化(spec 11章 フェーズ9)。
    // manifest.json と Service Worker を自動生成する。
    // vite-plugin-pwa / workbox はどちらも MIT ライセンスで無料、
    // ビルド時にファイルを吐くだけなので外部サービスへの通信も課金も発生しない。
    VitePWA({
      // 更新があっても勝手に読み込み直さず、画面上で知らせて選んでもらう。
      // 入力途中に突然リロードされるのを避けるため。
      registerType: 'prompt',
      // 登録処理は src/pwa/register.js で自前に行う(更新の通知を受け取るため)
      injectRegister: null,
      manifest: {
        name: '時間割管理',
        short_name: '時間割',
        description: '大学の時間割・出欠・課題・単位を管理するアプリ',
        lang: 'ja',
        // ホーム画面から起動したときにブラウザのUIを出さない
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        background_color: '#0a0e1a',
        theme_color: '#0a0e1a',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // オフラインで完全動作させるため、ビルド成果物を一通りキャッシュする
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // どのURLで開いても index.html を返す(自前ナビゲーションのため経路は1つ)
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      // 開発サーバー(localhost)でも Service Worker を動かし、
      // PWAとしての挙動を確認できるようにする
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true,
      },
    }),
  ],
  server: {
    host: true, // 同一Wi-Fi内のiPhoneから開発サーバーへアクセスするため
  },
})
