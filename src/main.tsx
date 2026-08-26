import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { seedIfEmpty } from './db/seed'
import { initTheme } from './lib/theme'
import './styles/global.css'

initTheme()

// 첫 실행일 때만 RIIZE 멤버와 기본 카테고리를 넣어둔다.
void seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
