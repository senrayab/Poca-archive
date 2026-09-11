import type { ComponentType, ReactNode } from 'react'
import type { Card, Category } from '@/db/types'

/**
 * 스킨이 갈아끼우는 레이아웃.
 *
 * 지금까지 스킨은 색과 모서리만 갈아끼웠다. 마크업은 한 벌을 넷이 같이
 * 썼으므로, 무엇을 어디에 놓을지는 늘 같았고 스킨을 바꿔도 '같은 앱에
 * 다른 물감'이었다.
 *
 * 그래서 화면과 레이아웃을 가른다. 화면(pages/)은 무엇을 보여줄지만 알고,
 * 어떻게 놓을지는 스킨이 고른 부품이 맡는다. 그 사이를 오가는 것이 아래의
 * 꾸러미다 — 값과 손짓만 담고, 생김새에 대한 말은 한 마디도 담지 않는다.
 *
 * 그래야 레이아웃을 새로 짜는 사람이 DB도 자르기도 중복 찾기도 건드리지
 * 않고, 오직 '어떻게 보일까'만 생각할 수 있다.
 */

export type ArchiveMode = 'all' | 'favorites' | 'trash'

export interface ArchiveView {
  mode: ArchiveMode
  /** 화면 이름. 고르는 중이면 '3장 선택'처럼 바뀐다. */
  title: string
  /** 아직 읽어오는 중. 빈 화면과 구별해야 한 번 깜빡이지 않는다. */
  loading: boolean
  cards: Card[]
  /** 보여줄 것이 없을 때 놓을 말. 사연마다 다르므로 화면이 만들어 넘긴다. */
  empty: ReactNode

  selected: Set<string>
  selectMode: boolean
  onOpen: (card: Card) => void
  onToggleSelect: (card: Card) => void
  /** 쓸어 고르는 동안 바뀐 상태를 통째로 받는다 */
  onSweep: (next: Set<string>) => void
  onSelectAll: () => void
  onClearSelection: () => void

  memberId: string | null
  onSelectMember: (id: string | null) => void
  onAddMember: () => void

  categories: Category[]
  categoryId: string | null
  onSelectCategory: (id: string | null) => void

  query: string
  onClearQuery: () => void
  /** 사진으로 찾은 결과. null이면 그 기능을 쓰지 않는 상태다. */
  byImage: string[] | null
  onClearByImage: () => void
  onOpenSearch: () => void

  /*
   * 고른 카드에 하는 일. 화면 성격에 따라 없을 수 있어 물음표를 달았다 —
   * 휴지통에서만 되돌리기와 완전 삭제가 있고, 나머지에는 버리기만 있다.
   */
  onTrash?: () => void
  onRestore?: () => void
  onPurge?: () => void
  onEmptyTrash?: () => void
}

export interface HeaderView {
  title: string
  /** 흐름을 빠져나오는 화면(등록)만 뒤로가기를 쓴다 */
  back?: boolean
  /** 아래 붙는 층이 헤더 자리까지 덮는 배경을 직접 그릴 때 켠다 */
  bare?: boolean
  actions?: ReactNode
}

/*
 * 레이아웃의 부품은 반드시 컴포넌트로 둔다.
 *
 * 함수처럼 불러 쓰면(Archive({...})) 그 안의 훅이 부른 쪽의 훅 줄에 끼어든다.
 * 스킨을 바꾸는 순간 부품이 갈리므로 훅의 수가 달라지고, 리액트는 그때
 * '훅이 모자란다'며 화면을 통째로 놓친다. <Archive {...view} />로 세워두면
 * 부품마다 제 훅 줄을 갖는다.
 */
export interface Layout {
  Header: ComponentType<HeaderView>
  Archive: ComponentType<ArchiveView>
  /**
   * 스킨이 제 길찾기를 갖는 경우.
   *
   * 없으면 기본 차림(오른쪽 아래 FAB + 햄버거로 여는 서랍)을 쓴다. 있으면
   * FAB를 띄우지 않는다 — 아래 탭바를 두는 스킨에서 등록 단추가 둘이 되면
   * 어느 쪽이 진짜인지 알 수 없다.
   */
  Nav: ComponentType
  /**
   * 자세히보기를 한 페이지로 열지.
   *
   * 기본 차림은 목록 위에 덮어 뜨는 층이다. 아래 탭바를 둔 스킨에서는
   * 그게 어색하다 — 탭바가 늘 보이는 앱에서 화면을 통째로 덮는 층은
   * '어디로도 못 가는 곳'처럼 느껴진다.
   *
   * 페이지로 열면 주소가 생기므로 폰의 뒤로가기가 저절로 맞아떨어지고,
   * 층을 세어 히스토리를 손보던 일(useBackClose)도 필요 없어진다.
   */
  detailAsPage?: boolean
  /**
   * 화면 뒤에 까는 것.
   *
   * 여태 모든 스킨이 무지 배경이었다. 지금 보고 있는 카드를 크게 흐려
   * 깔면 무엇을 보고 있는지가 글자 없이도 읽히는데, 그건 색 토큰으로는
   * 할 수 없는 일이다 — 사진을 읽어와야 하기 때문이다. 그래서 스킨이
   * 직접 그리게 자리를 낸다. 없으면 아무것도 깔리지 않는다.
   */
  Backdrop?: ComponentType<{ card?: Card }>
}
