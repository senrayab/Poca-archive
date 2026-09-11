import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { seedIfEmpty } from './db/seed'
import { initAppName } from './lib/appName'
import { initTheme } from './lib/theme'
import './styles/global.css'
// 레이아웃까지 제 것을 갖는 스킨은 규칙도 제 파일에 둔다
import './styles/skin-soft.css'
import './styles/skin-nocturne.css'

initTheme()
initAppName()

// 첫 실행일 때만 RIIZE 멤버와 기본 카테고리를 넣어둔다.
void seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
