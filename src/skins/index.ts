import type { SkinId } from '@/lib/theme'
import { useSkin } from '@/lib/theme'
import { classic } from './classic'
import type { Layout } from './types'

/**
 * 스킨이 어떤 레이아웃을 쓰는가.
 *
 * 색 한 벌과 레이아웃 한 벌은 따로다. 여러 스킨이 같은 레이아웃 위에서
 * 색만 달리 입을 수 있고(지금 넷이 그렇다), 하나가 제 레이아웃을 갖게 되면
 * 이 표에서 그 줄만 바꾸면 된다.
 */
const LAYOUTS = { classic } as const

type LayoutId = keyof typeof LAYOUTS

const OF_SKIN: Record<SkinId, LayoutId> = {
  pastel: 'classic',
  mono: 'classic',
  aurora: 'classic',
  brick: 'classic',
}

export function useLayout(): Layout {
  return LAYOUTS[OF_SKIN[useSkin()]]
}

export type { ArchiveMode, ArchiveView, HeaderView, Layout } from './types'
