import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type SkinId = 'pastel' | 'mono'

const THEME_KEY = 'poca:theme'
const SKIN_KEY = 'poca:skin'

/**
 * 스킨은 '토큰 한 벌'이다. CSS에서 :root[data-skin='...'] 로 색·둥글기·그림자를
 * 통째로 갈아끼우기 때문에, 여기서는 어떤 스킨이 있는지와 그 이름만 안다.
 */
export const SKINS: Array<{ id: SkinId; name: string; hint: string }> = [
  { id: 'pastel', name: '파스텔', hint: '파스텔 얼룩 배경에 코랄 포인트, 한쪽이 물린 둥글기' },
  { id: 'mono', name: '모노', hint: '무채색 배경에 검정 포인트, 얇은 테두리와 균일한 둥글기' },
]

const SKIN_IDS: SkinId[] = SKINS.map((s) => s.id)

/** 주소창/상태바 색. CSS의 --bg와 값을 맞춰둔다. */
const BAR_COLOR: Record<SkinId, Record<'light' | 'dark', string>> = {
  pastel: { dark: '#0f0e14', light: '#f4f3f9' },
  mono: { dark: '#0b0b0c', light: '#f1f1f2' },
}

const media =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function readTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힐 수 있다.
    return 'system'
  }
}

function readSkin(): SkinId {
  try {
    const raw = localStorage.getItem(SKIN_KEY) as SkinId | null
    return raw && SKIN_IDS.includes(raw) ? raw : 'pastel'
  } catch {
    return 'pastel'
  }
}

let mode: ThemeMode = readTheme()
let skin: SkinId = readSkin()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function resolveTheme(next: ThemeMode = mode): 'light' | 'dark' {
  if (next !== 'system') return next
  return media?.matches ? 'dark' : 'light'
}

function apply() {
  const root = document.documentElement
  // 'system'일 때는 속성을 지워 CSS의 prefers-color-scheme 규칙에 맡긴다.
  if (mode === 'system') delete root.dataset.theme
  else root.dataset.theme = mode
  root.dataset.skin = skin

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', BAR_COLOR[skin][resolveTheme()])
}

export function setThemeMode(next: ThemeMode) {
  mode = next
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용된다 */
  }
  apply()
  emit()
}

export function setSkin(next: SkinId) {
  skin = next
  try {
    localStorage.setItem(SKIN_KEY, next)
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용된다 */
  }
  apply()
  emit()
}

/** 시스템 설정을 따르는 동안 OS 테마가 바뀌면 같이 따라간다. */
media?.addEventListener('change', () => {
  if (mode !== 'system') return
  apply()
  emit()
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

export function useSkin(): SkinId {
  return useSyncExternalStore(
    subscribe,
    () => skin,
    () => 'pastel' as SkinId,
  )
}
