import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerPWA } from './pwa/register.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker を登録して、オフライン動作とホーム画面への追加を有効にする。
// 画面の描画を待たせないよう、render のあとに呼ぶ。
registerPWA()
