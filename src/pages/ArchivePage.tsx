import { useEffect, useMemo, useState } from 'react'
import { Header, useShell } from '@/components/AppShell'
import { CardDetail } from '@/components/CardDetail'
import { CardGrid } from '@/components/CardGrid'
import {
  CheckIcon,
  CloseIcon,
  RestoreIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/Icons'
import { MemberTabs } from '@/components/MemberTabs'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { db, purgeCards } from '@/db/db'
import type { Card } from '@/db/types'
import { useCategories, useCards } from '@/hooks/useData'
import { useAppName } from '@/lib/appName'

export type ArchiveMode = 'all' | 'favorites' | 'trash'

/* 전체 보관함의 제목은 설정에서 바꾼 이름을 쓴다 */
const TITLES: Record<Exclude<ArchiveMode, 'all'>, string> = {
  favorites: '즐겨찾기',
  trash: '휴지통',
}

interface ArchivePageProps {
  mode: ArchiveMode
}

export function ArchivePage({ mode }: ArchivePageProps) {
  const { openMemberEditor } = useShell()
  const appName = useAppName()
  const toast = useToast()
  const categories = useCategories()

  const [memberId, setMemberId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [openCard, setOpenCard] = useState<Card | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const cards = useCards({
    memberId,
    categoryId,
    query,
    favoriteOnly: mode === 'favorites',
    deleted: mode === 'trash' ? 1 : 0,
  })

  const loading = cards === undefined
  const list = useMemo(() => cards ?? [], [cards])
  const selectMode = selected.size > 0

  // 목록이 바뀌면(필터 변경, 삭제 등) 열려 있던 카드를 최신 상태로 다시 잡아준다.
  useEffect(() => {
    if (!openCard) return
    const fresh = list.find((c) => c.id === openCard.id)
    if (fresh && fresh !== openCard) setOpenCard(fresh)
  }, [list, openCard])

  useEffect(() => {
    setSelected(new Set())
  }, [mode, memberId, categoryId])

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
      toast(action === 'trash' ? `${ids.length}장을 휴지통으로 옮겼습니다.` : `${ids.length}장을 되돌렸습니다.`)
    }
    setSelected(new Set())
  }

  const emptyAll = async () => {
    const count = await db.cards.where('deleted').equals(1).count()
    if (!count) return toast('휴지통이 비어 있습니다.')
    if (!confirm(`휴지통의 ${count}장을 완전히 삭제할까요? 되돌릴 수 없습니다.`)) return
    const ids = await db.cards.where('deleted').equals(1).primaryKeys()
    await purgeCards(ids)
    toast('휴지통을 비웠습니다.')
  }

  return (
    <>
      <Header
        title={
          selectMode
            ? `${selected.size}장 선택`
            : mode === 'all'
              ? appName
              : TITLES[mode]
        }
        actions={
          selectMode ? (
            <>
              {mode === 'trash' ? (
                <>
                  <button className="icon-btn" onClick={() => bulk('restore')} aria-label="되돌리기">
                    <RestoreIcon />
                  </button>
                  <button className="icon-btn" onClick={() => bulk('purge')} aria-label="완전 삭제">
                    <TrashIcon />
                  </button>
                </>
              ) : (
                <button className="icon-btn" onClick={() => bulk('trash')} aria-label="휴지통으로">
                  <TrashIcon />
                </button>
              )}
              <button
                className="icon-btn"
                onClick={() => setSelected(new Set())}
                aria-label="선택 해제"
              >
                <CloseIcon />
              </button>
            </>
          ) : (
            <>
              {mode === 'trash' && list.length > 0 && (
                <button className="icon-btn" onClick={emptyAll} aria-label="휴지통 비우기">
                  <TrashIcon />
                </button>
              )}
              <button
                className="icon-btn"
                data-active={searchOpen || query !== ''}
                onClick={() => setSearchOpen(true)}
                aria-label="검색"
              >
                <SearchIcon />
              </button>
            </>
          )
        }
      />

      <div className="content">
        {/*
          멤버 레일과 분류 텍스트를 한 덩어리로 묶어 통째로 sticky 시킨다.
          따로 두면 스크롤할 때 둘 사이 틈으로 카드가 비쳐 지나가고,
          레일 그림자가 아래 분류줄에 잘려 보였다.
        */}
        <div className="filters">
          <MemberTabs
            selected={memberId}
            onSelect={setMemberId}
            onAddMember={() => openMemberEditor()}
          />

          {categories.length > 0 && (
            <div className="subtabs" role="tablist" aria-label="카테고리">
              <button
                role="tab"
                aria-selected={categoryId === null}
                onClick={() => setCategoryId(null)}
              >
                전체 분류
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={categoryId === c.id}
                  onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {query && (
          <div className="active-query">
            <button className="tag" onClick={() => setQuery('')}>
              <SearchIcon size={13} />
              {query}
              <CloseIcon size={13} />
            </button>
          </div>
        )}

        {loading ? null : list.length === 0 ? (
          <EmptyState mode={mode} filtered={Boolean(query || memberId || categoryId)} />
        ) : (
          <CardGrid
            cards={list}
            selectable={selectMode}
            selectedIds={selected}
            onOpen={setOpenCard}
            onToggleSelect={toggleSelect}
          />
        )}

        {!selectMode && list.length > 0 && (
          <div className="grid-foot">
            <span>
              총 {list.length}장 · 카드를 길게(우클릭) 누르면 여러 장 선택
            </span>
            <button
              className="btn btn--sm"
              onClick={() => setSelected(new Set(list.map((c) => c.id)))}
            >
              <CheckIcon size={15} />
              전체 선택
            </button>
          </div>
        )}
      </div>

      {searchOpen && (
        <SearchSheet
          value={query}
          onChange={setQuery}
          resultCount={list.length}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {openCard && (
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
        <p>멤버·분류 탭이나 검색어를 바꿔 보세요.</p>
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
        <strong>즐겨찾기한 카드가 없어요</strong>
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

/*
 * 검색은 목록 위에 얹는 팝업으로 연다.
 * 목록 맨 위에 붙여두면 한참 스크롤해 내려간 상태에서 검색하려고
 * 매번 맨 위까지 올라와야 한다.
 */
function SearchSheet({
  value,
  onChange,
  resultCount,
  onClose,
}: {
  value: string
  onChange: (next: string) => void
  resultCount: number
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose} panel={false} label="검색">
      <form
        className="search-sheet"
        onSubmit={(e) => {
          e.preventDefault()
          onClose()
        }}
      >
        <div className="search-sheet__top">
          <button
            type="button"
            className="search-sheet__close"
            onClick={onClose}
            aria-label="닫기"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="search-sheet__field">
          <SearchIcon size={20} />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="제목 · 메모에서 검색"
            autoFocus
          />
          {value && (
            <button
              type="button"
              className="search-sheet__clear"
              onClick={() => onChange('')}
              aria-label="지우기"
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>

        {/* 입력하는 동안 뒤쪽 목록이 이미 걸러지고 있으므로 장수를 바로 보여준다 */}
        <p className="search-sheet__hint">
          {value ? `${resultCount}장 찾았어요` : '카드 제목과 메모에서 찾습니다'}
        </p>

        {/* 엔터로 닫히도록 폼은 유지하되, 버튼은 화면에 두지 않는다 */}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
