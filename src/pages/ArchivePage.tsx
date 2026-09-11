import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { CardDetail } from '@/components/CardDetail'
import { CameraIcon, CloseIcon, ImageIcon, SearchIcon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { db, purgeCards } from '@/db/db'
import type { Card } from '@/db/types'
import { useCategories, useCards } from '@/hooks/useData'
import { backfillPrints, findLike, fingerprintOf } from '@/lib/duplicates'
import { SHOW_CATEGORY } from '@/lib/features'
import { CameraCapture, canUseCamera } from '@/components/CameraCapture'
import { useAppName } from '@/lib/appName'
import { useLayout } from '@/skins'
import type { ArchiveMode, ArchiveView } from '@/skins/types'

export type { ArchiveMode }

/* 전체 보관함의 제목은 설정에서 바꾼 이름을 쓴다 */
const TITLES: Record<Exclude<ArchiveMode, 'all'>, string> = {
  favorites: '좋아요',
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
  const navigate = useNavigate()
  const location = useLocation()
  /*
   * 사진으로 찾은 결과. 지문이 닮은 카드의 id만 가까운 순으로 담는다.
   * null이면 사진 검색을 쓰지 않는 상태다.
   */
  const [byImage, setByImage] = useState<string[] | null>(null)
  const [looking, setLooking] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const cards = useCards({
    memberId,
    categoryId,
    query,
    favoriteOnly: mode === 'favorites',
    deleted: mode === 'trash' ? 1 : 0,
  })

  const loading = cards === undefined
  const list = useMemo(() => {
    const all = cards ?? []
    if (!byImage) return all
    // 닮은 순서를 그대로 살린다 — 가장 비슷한 것이 맨 앞이라야 눈에 먼저 든다
    const rank = new Map(byImage.map((id, i) => [id, i]))
    return all.filter((c) => rank.has(c.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
  }, [cards, byImage])
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

  /*
   * 아래 탭바의 검색은 화면을 옮기는 게 아니라 이 화면의 시트를 여는 일이다.
   * 그래서 보관함으로 오면서 state에 표시를 남기고, 여기서 그걸 받아 연다.
   * 주소에는 흔적이 없으므로 새로고침하면 그냥 보관함이다.
   *
   * 표시를 지우는 건 같은 자리에서 또 눌렀을 때를 위해서다 — 값이 남아
   * 있으면 두 번째 누름이 아무 일도 일으키지 못한다.
   */
  const findAt = (location.state as { find?: number } | null)?.find
  useEffect(() => {
    if (!findAt) return
    setSearchOpen(true)
    navigate(location.pathname, { replace: true, state: null })
  }, [findAt, location.pathname, navigate])

  /*
   * 사진 한 장을 받아 닮은 카드를 찾는다.
   *
   * 이미 가진 카드인지 손에 들고 확인하는 용도라, 받은 사진은 어디에도
   * 저장하지 않는다 — 지문만 뽑고 그림은 그 자리에서 버린다.
   */
  const lookUp = async (file: Blob) => {
    setLooking(true)
    try {
      await backfillPrints()
      const fp = await fingerprintOf(file)
      if (!fp) return toast('사진을 읽지 못했습니다.')
      const hits = await findLike(fp)
      setByImage(hits.map((h) => h.cardId))
      toast(hits.length ? `닮은 카드 ${hits.length}장을 찾았어요.` : '닮은 카드가 없어요.')
    } finally {
      setLooking(false)
    }
  }


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
    title: selectMode
      ? `${selected.size}장 선택`
      : mode === 'all'
        ? appName
        : TITLES[mode],
    loading,
    cards: list,
    empty: (
      <EmptyState mode={mode} filtered={Boolean(query || memberId || categoryId || byImage)} />
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

    query,
    onClearQuery: () => setQuery(''),
    byImage,
    onClearByImage: () => setByImage(null),
    onOpenSearch: () => setSearchOpen(true),

    // 휴지통에서만 되돌리기와 완전 삭제가 있고, 나머지에는 버리기만 있다
    onTrash: mode === 'trash' ? undefined : () => void bulk('trash'),
    onRestore: mode === 'trash' ? () => void bulk('restore') : undefined,
    onPurge: mode === 'trash' ? () => void bulk('purge') : undefined,
    onEmptyTrash: mode === 'trash' ? () => void emptyAll() : undefined,
  }

  return (
    <>
      <Archive {...view} />

      {searchOpen && (
        <SearchSheet
          value={query}
          onChange={setQuery}
          resultCount={list.length}
          looking={looking}
          onByImage={(file) => {
            setSearchOpen(false)
            void lookUp(file)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}

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

/*
 * 검색은 목록 위에 얹는 팝업으로 연다.
 * 목록 맨 위에 붙여두면 한참 스크롤해 내려간 상태에서 검색하려고
 * 매번 맨 위까지 올라와야 한다.
 */
function SearchSheet({
  value,
  onChange,
  resultCount,
  looking,
  onByImage,
  onClose,
}: {
  value: string
  onChange: (next: string) => void
  resultCount: number
  looking: boolean
  onByImage: (file: Blob) => void
  onClose: () => void
}) {
  const pickRef = useRef<HTMLInputElement>(null)
  const [shooting, setShooting] = useState(false)
  const [camera] = useState(canUseCamera)

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

        {/*
          사진으로 찾기. 손에 든 카드를 이미 등록했는지 확인하는 용도라,
          받은 사진은 지문만 뽑고 어디에도 저장하지 않는다.
        */}
        <div className="search-sheet__by-image">
          {/* 둘은 같은 일을 하는 두 갈래라 한 줄에 나란히 둔다 */}
          <div className="row">
            {camera && (
              <button
                type="button"
                className="btn"
                onClick={() => setShooting(true)}
                disabled={looking}
              >
                <CameraIcon size={17} />
                찍어서 찾기
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => pickRef.current?.click()}
              disabled={looking}
            >
              <ImageIcon size={17} />
              골라서 찾기
            </button>
          </div>
          <p className="search-sheet__hint">
            같은 그림을 찾습니다. 이미 등록한 카드인지 확인할 때 쓰세요.
          </p>
        </div>

        <input
          ref={pickRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onByImage(file)
          }}
        />

        {shooting && (
          <CameraCapture
            onShot={(file) => {
              setShooting(false)
              onByImage(file)
            }}
            onClose={() => setShooting(false)}
          />
        )}

        {/* 엔터로 닫히도록 폼은 유지하되, 버튼은 화면에 두지 않는다 */}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
