import type { SkinId } from '@/lib/theme'
import { useSkin } from '@/lib/theme'
import { atelier } from './atelier'
import { blank } from './blank'
import { classic } from './classic'
import { nocturne } from './nocturne'
import { prism } from './prism'
import { soft } from './soft'
import type { Layout } from './types'

/**
 * 스킨이 어떤 레이아웃을 쓰는가.
 *
 * 색 한 벌과 레이아웃 한 벌은 따로다. 여러 스킨이 같은 레이아웃 위에서
 * 색만 달리 입을 수 있고(지금 넷이 그렇다), 하나가 제 레이아웃을 갖게 되면
 * 이 표에서 그 줄만 바꾸면 된다.
 */
const LAYOUTS = { classic, soft, nocturne, prism, atelier, blank } as const

type LayoutId = keyof typeof LAYOUTS

const OF_SKIN: Record<SkinId, LayoutId> = {
  pastel: 'classic',
  soft: 'soft',
  nocturne: 'nocturne',
  prism: 'prism',
  atelier: 'atelier',
  blank: 'blank',
}

export function useLayout(): Layout {
  return LAYOUTS[OF_SKIN[useSkin()]]
}

export type { ArchiveMode, ArchiveView, GridView, HeaderView, Layout } from './types'
