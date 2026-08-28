import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'poca:theme'

/** 주소창/상태바 색. CSS의 --bg와 값을 맞춰둔다. */
const BAR_COLOR: Record<'light' | 'dark', string> = {
  dark: '#0f0e14',
  light: '#f4f3f9',
}

const media =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function read(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힐 수 있다.
    return 'system'
  }
}

let mode: ThemeMode = read()
const listeners = new Set<() => void>()

export function resolveTheme(next: ThemeMode = mode): 'light' | 'dark' {
  if (next !== 'system') return next
  return media?.matches ? 'dark' : 'light'
}

function apply() {
  const root = document.documentElement
  // 'system'일 때는 속성을 지워 CSS의 prefers-color-scheme 규칙에 맡긴다.
  if (mode === 'system') delete root.dataset.theme
  else root.dataset.theme = mode

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR_COLOR[resolveTheme()])
}

export function setThemeMode(next: ThemeMode) {
  mode = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용된다 */
  }
  apply()
  listeners.forEach((listener) => listener())
}

/** 시스템 설정을 따르는 동안 OS 테마가 바뀌면 같이 따라간다. */
media?.addEventListener('change', () => {
  if (mode !== 'system') return
  apply()
  listeners.forEach((listener) => listener())
})

export function initTheme() {
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useThemeMode(): [ThemeMode, 'light' | 'dark'] {
  const current = useSyncExternalStore(
    subscribe,
    () => mode,
    () => 'system' as ThemeMode,
  )
  return [current, resolveTheme(current)]
}
