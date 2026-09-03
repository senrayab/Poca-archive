import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type SkinId = 'pastel' | 'mono'
export type FavCut = 'notch' | 'disc'

const THEME_KEY = 'poca:theme'
const SKIN_KEY = 'poca:skin'
const ACCENT_KEY = 'poca:accent'
const FAVCUT_KEY = 'poca:favcut'

/** 포인트 색 추천값. 직접 고르는 것도 되니 안내용에 가깝다. */
export const ACCENT_PRESETS = [
  '#ff3d57',
  '#f5809f',
  '#f2724a',
  '#e0a63c',
  '#3fae7a',
  '#3f8ee0',
  '#7b5cf0',
  '#1a1a1e',
]

/**
 * 스킨은 '토큰 한 벌'이다. CSS에서 :root[data-skin='...'] 로 색·둥글기·그림자를
 * 통째로 갈아끼우기 때문에, 여기서는 어떤 스킨이 있는지와 그 이름만 안다.
 */
export const SKINS: Array<{ id: SkinId; name: string; hint: string }> = [
  { id: 'pastel', name: '파스텔', hint: '파스텔 얼룩 배경에 코랄 포인트, 한쪽이 물린 둥글기' },
  { id: 'mono', name: '모노', hint: '무채색 배경에 검정 포인트, 얇은 테두리와 균일한 둥글기' },
]

const SKIN_IDS: SkinId[] = SKINS.map((s) => s.id)

/**
 * 자세히보기에서 찜 하트가 앉는 자리의 모양.
 * 실제 곡선은 CSS의 --fav-shape가 갖고 있고, 여기서는 이름만 안다.
 */
export const FAV_CUTS: Array<{ id: FavCut; name: string }> = [
  { id: 'notch', name: '잘린 모서리' },
  { id: 'disc', name: '떨어진 조각' },
]

const FAV_CUT_IDS: FavCut[] = FAV_CUTS.map((c) => c.id)

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

function readAccent(): string | null {
  try {
    const raw = localStorage.getItem(ACCENT_KEY)
    return raw && /^#[0-9a-f]{6}$/i.test(raw) ? raw : null
  } catch {
    return null
  }
}

function readFavCut(): FavCut {
  try {
    const raw = localStorage.getItem(FAVCUT_KEY) as FavCut | null
    return raw && FAV_CUT_IDS.includes(raw) ? raw : 'disc'
  } catch {
    return 'disc'
  }
}

let mode: ThemeMode = readTheme()
let skin: SkinId = readSkin()
let accent: string | null = readAccent()
let favCut: FavCut = readFavCut()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function resolveTheme(next: ThemeMode = mode): 'light' | 'dark' {
  if (next !== 'system') return next
  return media?.matches ? 'dark' : 'light'
}

/** 포인트 색 위에 올릴 글자색. 배경이 밝으면 검정, 어두우면 흰색. */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? '#111114' : '#ffffff'
}

function apply() {
  const root = document.documentElement
  // 'system'일 때는 속성을 지워 CSS의 prefers-color-scheme 규칙에 맡긴다.
  if (mode === 'system') delete root.dataset.theme
  else root.dataset.theme = mode
  root.dataset.skin = skin
  root.dataset.favcut = favCut

  /*
   * 포인트 색은 인라인 스타일로 얹는다. 인라인이 스타일시트보다 세므로
   * 어떤 스킨/테마를 골라도 이 값이 이긴다. 비우면 스킨 기본값으로 돌아간다.
   */
  if (accent) {
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-ink', inkFor(accent))
    root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 12%, transparent)`)
    root.style.setProperty('--glow', `0 8px 22px color-mix(in srgb, ${accent} 34%, transparent)`)
  } else {
    for (const name of ['--accent', '--accent-ink', '--accent-soft', '--glow']) {
      root.style.removeProperty(name)
    }
  }

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

export function setFavCut(next: FavCut) {
  favCut = next
  try {
    localStorage.setItem(FAVCUT_KEY, next)
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용된다 */
  }
  apply()
  emit()
}

/** null이면 스킨 기본 포인트 색으로 돌아간다. */
export function setAccent(next: string | null) {
  accent = next
  try {
    if (next) localStorage.setItem(ACCENT_KEY, next)
    else localStorage.removeItem(ACCENT_KEY)
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

export function useFavCut(): FavCut {
  return useSyncExternalStore(
    subscribe,
    () => favCut,
    () => 'disc' as FavCut,
  )
}

export function useAccent(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => accent,
    () => null,
  )
}
