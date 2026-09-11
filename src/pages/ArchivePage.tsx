import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { CardDetail } from '@/components/CardDetail'
import { useToast } from '@/components/Toast'
import { db, purgeCards } from '@/db/db'
import type { Card } from '@/db/types'
import { useCategories, useCards } from '@/hooks/useData'
import { useScrollMemory } from '@/hooks/useScrollMemory'
import { SHOW_CATEGORY } from '@/lib/features'
import { useLayout } from '@/skins'
import type { ArchiveMode, ArchiveView } from '@/skins/types'

export type { ArchiveMode }

const TITLES: Record<ArchiveMode, string> = {
  all: '보관함',
  favorites: '좋아요',
  trash: '휴지통',
}

interface ArchivePageProps {
  mode: ArchiveMode
}

export function ArchivePage({ mode }: ArchivePageProps) {
  const { openMemberEditor } = useShell()
  const toast = useToast()
  const categories = useCategories()

  const [memberId, setMemberId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [openCard, setOpenCard] = useState<Card | null>(null)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const cards = useCards({
    query: '',
    memberId,
    categoryId,
    favoriteOnly: mode === 'favorites',
    deleted: mode === 'trash' ? 1 : 0,
  })

  const loading = cards === undefined
  const list = useMemo(() => cards ?? [], [cards])
  const selectMode = selected.size > 0

  /* 자세히보기에 갔다 오면 보던 자리로 돌아온다 */
  useScrollMemory(`archive:${mode}`, !loading && list.length > 0)

  // 목록이 바뀌면(필터 변경, 삭제 등) 열려 있던 카드를 최신 상태로 다시 잡아준다.
  useEffect(() => {
    if (!openCard) return
    const fresh = list.find((c) => c.id === openCard.id)
    if (fresh && fresh !== openCard) setOpenCard(fresh)
  }, [list, openCard])

  useEffect(() => {
    setSelected(new Set())
  }, [mode, memberId, categoryId])


  /*
   * 쓸고 있는 동안의 고름 상태. 격자가 '시작한 칸부터 지금 칸까지'를 매번
   * 다시 짜서 통째로 넘겨주므로, 여기서는 그대로 받아 두기만 하면 된다.
   */
  const sweepCards = (next: Set<string>) => setSelected(next)

  const toggleSelect = (card: Card) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(card.id)) next.delete(card.id)
      else next.add(card.id)
      return next
    })
  }

  const bulk = async (action: 'trash' | 'restore' | 'purge') => {
    const ids = [...selected]
    if (!ids.length) return
    if (action === 'purge' && !confirm(`${ids.length}장을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) {
      return
    }

    if (action === 'purge') {
      await purgeCards(ids)
      toast(`${ids.length}장을 완전히 삭제했습니다.`)
    } else {
      const patch =
        action === 'trash'
          ? { deleted: 1 as const, deletedAt: Date.now(), updatedAt: Date.now() }
          : { deleted: 0 as const, deletedAt: null, updatedAt: Date.now() }
      await db.transaction('rw', db.cards, async () => {
        for (const id of ids) await db.cards.update(id, patch)
      })
      toast(
        action === 'trash'
          ? `${ids.length}장을 휴지통으로 옮겼습니다.`
          : `${ids.length}장을 되돌렸습니다.`,
      )
    }
    setSelected(new Set())
  }

  const emptyAll = async () => {
    // 이미 사진을 지운 기록은 휴지통에 없다 — 셀 때도 빼야 장수가 맞는다
    const inTrash = db.cards.where('[deleted+photoGone]').equals([1, 0])
    const count = await inTrash.count()
    if (!count) return toast('휴지통이 비어 있습니다.')
    if (!confirm(`휴지통의 ${count}장을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return
    const ids = await db.cards.where('[deleted+photoGone]').equals([1, 0]).primaryKeys()
    await purgeCards(ids)
    toast('휴지통을 비웠습니다.')
  }

  /*
   * 여기서부터는 '무엇을 보여줄지'만 담아 넘긴다.
   *
   * 놓는 일은 스킨이 고른 레이아웃이 맡는다. 그래서 이 화면은 격자가 몇
   * 열인지도, 머리가 어떻게 생겼는지도 모른다 — 대신 어떤 카드가 있고
   * 무엇을 누르면 무슨 일이 나는지만 안다.
   */
  const { Archive, detailAsPage } = useLayout()

  const view: ArchiveView = {
    mode,
    title: selectMode ? `${selected.size}장 선택` : TITLES[mode],
    loading,
    cards: list,
    empty: (
      <EmptyState mode={mode} filtered={Boolean(memberId || categoryId)} />
    ),

    selected,
    selectMode,
    /*
     * 스킨이 자세히보기를 페이지로 열면 주소를 옮기고, 아니면 지금처럼
     * 목록 위에 층을 얹는다. 어느 쪽인지는 화면이 아니라 레이아웃이 안다.
     */
    onOpen: (card: Card) => (detailAsPage ? navigate(`/card/${card.id}`) : setOpenCard(card)),
    onToggleSelect: toggleSelect,
    onSweep: sweepCards,
    onSelectAll: () => setSelected(new Set(list.map((c) => c.id))),
    onClearSelection: () => setSelected(new Set()),

    memberId,
    onSelectMember: setMemberId,
    onAddMember: () => openMemberEditor(),

    categories,
    categoryId,
    onSelectCategory: setCategoryId,

    // 휴지통에서만 되돌리기와 완전 삭제가 있고, 나머지에는 버리기만 있다
    onTrash: mode === 'trash' ? undefined : () => void bulk('trash'),
    onRestore: mode === 'trash' ? () => void bulk('restore') : undefined,
    onPurge: mode === 'trash' ? () => void bulk('purge') : undefined,
    onEmptyTrash: mode === 'trash' ? () => void emptyAll() : undefined,
  }

  return (
    <>
      <Archive {...view} />

      {openCard && !detailAsPage && (
        <CardDetail
          card={openCard}
          siblings={list}
          onNavigate={setOpenCard}
          onClose={() => setOpenCard(null)}
        />
      )}
    </>
  )
}

function EmptyState({ mode, filtered }: { mode: ArchiveMode; filtered: boolean }) {
  if (filtered) {
    return (
      <div className="empty">
        <strong>조건에 맞는 카드가 없어요</strong>
        <p>{SHOW_CATEGORY ? '멤버·분류 탭이나 검색어를 바꿔 보세요.' : '멤버 탭이나 검색어를 바꿔 보세요.'}</p>
      </div>
    )
  }
  if (mode === 'trash') {
    return (
      <div className="empty">
        <strong>휴지통이 비어 있어요</strong>
        <p>양도하거나 판매한 카드를 삭제하면 여기로 들어옵니다.</p>
      </div>
    )
  }
  if (mode === 'favorites') {
    return (
      <div className="empty">
        <strong>좋아요한 카드가 없어요</strong>
        <p>카드를 열어 하트를 누르면 여기에 모입니다.</p>
      </div>
    )
  }
  return (
    <div className="empty">
      <strong>아직 등록한 포토카드가 없어요</strong>
      <p>
        오른쪽 아래 + 버튼으로 사진을 올려보세요.
        <br />
        올린 사진은 자동으로 WebP로 변환돼 용량을 크게 줄입니다.
      </p>
    </div>
  )
}
