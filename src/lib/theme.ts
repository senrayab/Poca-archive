import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type SkinId = 'pastel' | 'soft' | 'nocturne' | 'prism' | 'atelier' | 'blank'
export type FavCut = 'notch' | 'disc'
/** 보관함 이름에 쓸 글꼴 */
export type NameFont = 'app' | 'system' | 'sans' | 'serif' | 'mono'

const THEME_KEY = 'poca:theme'
const SKIN_KEY = 'poca:skin'
const ACCENT_KEY = 'poca:accent'
const FAVCUT_KEY = 'poca:favcut'
const NAMEFONT_KEY = 'poca:namefont'

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
  {
    id: 'atelier',
    name: '아틀리에',
    hint: '크림 종이 위 작품 목록, 큰 숫자와 카드마다 붙는 번호',
  },
  {
    id: 'prism',
    name: '프리즘',
    hint: '상아빛 위의 무색 유리 진열장, 카드가 서리유리 슬리브에 꽂혀 있는 세 열',
  },
  {
    id: 'nocturne',
    name: '녹턴',
    hint: '보고 있는 카드가 뒤에 흐려져 깔리는 밤. 늘 어둡게 간다',
  },
  {
    id: 'soft',
    name: '소프트',
    hint: '회색 바탕에 흰 판이 떠 있는 결, 세 열 격자와 아래 알약 탭바',
  },
  {
    id: 'blank',
    name: '여백',
    hint: '순백에 가는 활자가 가운데로 모이는 전시장. 늘 밝게 간다',
  },
]

const SKIN_IDS: SkinId[] = SKINS.map((s) => s.id)

/**
 * 자세히보기에서 좋아요 하트가 앉는 자리의 모양.
 * 실제 곡선은 CSS의 --fav-shape가 갖고 있고, 여기서는 이름만 안다.
 */
export const FAV_CUTS: Array<{ id: FavCut; name: string }> = [
  { id: 'notch', name: '잘린 모서리' },
  { id: 'disc', name: '떨어진 조각' },
]

const FAV_CUT_IDS: FavCut[] = FAV_CUTS.map((c) => c.id)

/**
 * 보관함 이름에 쓸 글꼴.
 *
 * 폰에 넣어둔 글꼴(스토어에서 산 것 포함)을 쓰려면 브라우저에게 '기기
 * 글꼴을 달라'고 해야 하는데, 그 말을 하는 길이 둘이다.
 *
 *  - system-ui : 기기가 화면을 그릴 때 쓰는 글꼴을 직접 가리킨다.
 *  - sans-serif: 기기에 '기본 고딕으로 뭘 쓰냐'고 묻는다.
 *
 * 둘이 같은 글꼴로 풀리는 폰도 있고, 하나는 폰에 넣은 글꼴로 다른 하나는
 * 브라우저가 들고 있는 글꼴로 갈리는 폰도 있다. 어느 쪽이 통하는지는
 * 기기와 브라우저가 정하는 일이라 미리 알 수 없다. 그래서 둘 다 내주고
 * 고르게 한다 — 고르는 자리에서 이름이 그 글꼴로 바로 보이므로, 어느 것이
 * 제 글꼴인지는 눈으로 알아본다.
 *
 * 명조와 고정폭은 폰이 늘 한 벌씩 갖고 있어 확실히 달라 보이는 쪽이다.
 * 그 밖의 '또렷한 고딕' 같은 구분은 웹에서 받아오지 않는 한 결국 같은
 * 글꼴로 나오므로 두지 않았다.
 *
 * 실제 글꼴 목록은 CSS의 --appname-font가 갖고 있다.
 */
export const NAME_FONTS: Array<{ id: NameFont; name: string; hint: string }> = [
  { id: 'app', name: '앱 기본', hint: '지금까지 쓰던 글꼴' },
  { id: 'system', name: '기기 글꼴', hint: '폰이 화면을 그릴 때 쓰는 글꼴' },
  { id: 'sans', name: '기기 고딕', hint: '폰의 기본 고딕 — 위와 다를 수 있어요' },
  { id: 'serif', name: '명조', hint: '붓의 맺음이 남은 쪽' },
  { id: 'mono', name: '고정폭', hint: '글자마다 자리가 고른 쪽' },
]

const NAME_FONT_IDS: NameFont[] = NAME_FONTS.map((f) => f.id)

/**
 * 주소창·상태바 색.
 *
 * 예전에는 스킨마다 값을 적어둔 표가 있었다. 그런데 표는 CSS를 보고 손으로
 * 옮겨 적은 것이라, 스킨을 하나 더하거나 색을 손볼 때마다 잊기 쉬웠다.
 * 포인트 색이 바탕까지 물들이게 된 뒤로는 아예 맞출 수가 없다 — 사람이
 * 고른 색에서 나오는 값을 미리 적어둘 방법이 없기 때문이다.
 *
 * 그래서 적어두는 대신 읽어 온다. 화면에 실제로 칠해진 색을 그대로 가져오니
 * 어떤 스킨이든, 포인트 색을 무엇으로 바꾸든 어긋날 자리가 없다.
 */
function barColor(): string {
  if (typeof document === 'undefined' || !document.body) return ''
  const painted = getComputedStyle(document.body).backgroundColor
  // 'rgb(20 18 26)'이든 'rgba(20, 18, 26, 1)'이든 숫자만 뽑으면 된다
  const parts = painted.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return painted
  const hex = parts
    .slice(0, 3)
    .map((v) => Math.round(Number(v)).toString(16).padStart(2, '0'))
    .join('')
  return `#${hex}`
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

function readNameFont(): NameFont {
  try {
    const raw = localStorage.getItem(NAMEFONT_KEY) as NameFont | null
    return raw && NAME_FONT_IDS.includes(raw) ? raw : 'app'
  } catch {
    return 'app'
  }
}

/** 고른 적 없으면 목록의 첫 번째 — 화면에서 왼쪽에 놓인 쪽을 쓴다. */
function readFavCut(): FavCut {
  try {
    const raw = localStorage.getItem(FAVCUT_KEY) as FavCut | null
    return raw && FAV_CUT_IDS.includes(raw) ? raw : 'notch'
  } catch {
    return 'notch'
  }
}

let mode: ThemeMode = readTheme()
let skin: SkinId = readSkin()
let accent: string | null = readAccent()
let favCut: FavCut = readFavCut()
let nameFont: NameFont = readNameFont()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function resolveTheme(next: ThemeMode = mode): 'light' | 'dark' {
  if (next !== 'system') return next
  return media?.matches ? 'dark' : 'light'
}

/**
 * 포인트 색이 바탕과 선에 스미는 정도.
 *
 * 스킨은 CSS에서 '-base' 이름으로 밑색만 정해두고, 여기서 그 위에 고른 색을
 * 섞는다. 손대지 않은 사람에게는 이 일이 아예 일어나지 않으므로 스킨이 정한
 * 색이 한 치도 어긋나지 않는다.
 *
 * 스민 정도는 자리마다 다르다. 넓게 깔리는 바탕일수록 옅게, 가늘어서 잘 안
 * 보이는 선일수록 짙게 둬야 같은 세기로 느껴진다.
 */
const TINTED: Array<[string, number]> = [
  ['--bg-elev', 3],
  ['--bg', 5],
  ['--desk-bg', 6],
  ['--bg-elev-2', 6],
  ['--line', 12],
]

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
  root.dataset.namefont = nameFont

  /*
   * 포인트 색은 인라인 스타일로 얹는다. 인라인이 스타일시트보다 세므로
   * 어떤 스킨/테마를 골라도 이 값이 이긴다. 비우면 스킨 기본값으로 돌아간다.
   */
  if (accent) {
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-ink', inkFor(accent))
    root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 12%, transparent)`)
    /*
     * 그림자의 번짐은 스킨이 정한다. 블록 스킨은 번지지 않는 오프셋 그림자를
     * 쓰는데, 여기서 모양까지 박아버리면 포인트 색을 바꾸는 순간 그 스킨만
     * 흐릿해졌다. 색만 갈아끼우고 모양은 스킨의 것(--glow-spread)을 쓴다.
     */
    const spread = getComputedStyle(root).getPropertyValue('--glow-spread').trim() || '0 8px 22px'
    root.style.setProperty('--glow', `${spread} color-mix(in srgb, ${accent} 34%, transparent)`)

    // 바탕과 선에도 고른 색이 옅게 스민다 (스킨의 밑색 위에)
    for (const [name, pct] of TINTED) {
      root.style.setProperty(name, `color-mix(in srgb, ${accent} ${pct}%, var(${name}-base))`)
    }
  } else {
    for (const name of ['--accent', '--accent-ink', '--accent-soft', '--glow']) {
      root.style.removeProperty(name)
    }
    // 스킨이 정한 밑색으로 돌아간다
    for (const [name] of TINTED) root.style.removeProperty(name)
  }

  const bar = barColor()
  if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar)
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

export function setNameFont(next: NameFont) {
  nameFont = next
  try {
    localStorage.setItem(NAMEFONT_KEY, next)
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
    () => 'notch' as FavCut,
  )
}

export function useNameFont(): NameFont {
  return useSyncExternalStore(
    subscribe,
    () => nameFont,
    () => 'app' as NameFont,
  )
}

export function useAccent(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => accent,
    () => null,
  )
}
