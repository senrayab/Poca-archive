import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/AppShell'
import { CardDetail } from '@/components/CardDetail'
import { CloseIcon, EditIcon, TrashIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { db, eraseCards } from '@/db/db'
import type { Card, CardStatus } from '@/db/types'
import { SHOW_CATEGORY } from '@/lib/features'
import { useCategories, useMembers } from '@/hooks/useData'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { formatDate } from '@/lib/format'

type Filter = 'all' | 'traded' | 'sold'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'traded', label: '양도함' },
  { id: 'sold', label: '판매함' },
]

const STATUS_LABEL: Partial<Record<CardStatus, string>> = {
  traded: '양도',
  sold: '판매',
}

/**
 * 양도·판매로 정리한 카드를 처리한 순서대로 훑어보는 화면.
 * 휴지통은 '되돌릴 수 있는 임시 보관'이라 격자로 보여주지만, 여기는
 * '무엇을 언제 넘겼나'를 읽는 곳이라 날짜가 붙은 목록이 맞다.
 */
export function HistoryPage() {
  const members = useMembers()
  const categories = useCategories()
  const [filter, setFilter] = useState<Filter>('all')
  const [openCard, setOpenCard] = useState<Card | null>(null)
  const [editing, setEditing] = useState(false)
  const toast = useToast()

  const cards = useLiveQuery(async () => {
    const rows = await db.cards.where('deleted').equals(1).toArray()
    return rows
      .filter((card) => card.status === 'traded' || card.status === 'sold')
      .sort((a, b) => (b.deletedAt ?? b.updatedAt) - (a.deletedAt ?? a.updatedAt))
  }, [])

  const list = useMemo(
    () => (cards ?? []).filter((card) => filter === 'all' || card.status === filter),
    [cards, filter],
  )

  /*
   * 자세히보기로 넘길 수 있는 것들.
   *
   * 사진을 지운 기록은 열어봐야 흐린 썸네일을 크게 늘린 것뿐이라 알아보기
   * 어렵다. 목록에 붙은 작은 썸네일만으로 무엇인지 알 수 있으니 거기서
   * 끝낸다. 좌우로 넘길 목록에서도 빼야, 옆으로 넘기다 빈 화면에 닿지 않는다.
   */
  const openable = useMemo(() => list.filter((card) => card.photoGone !== 1), [list])

  /*
   * 기록을 지우는 일은 되돌릴 수 없다.
   *
   * 여기 남은 것들은 이미 휴지통을 거쳤거나, 거치면서 사진까지 지운 것들이다.
   * 그러니 이 화면의 삭제는 마지막 삭제다 — 카드 행 자체가 사라진다. 잘못
   * 눌러 없어지는 일이 없도록 편집을 켜야만 단추가 보이고, 한 번 더 묻는다.
   */
  const erase = async (card: Card) => {
    const name = card.title || card.memo || '이 기록'
    if (!confirm(`${name}을(를) 기록에서 완전히 지웁니다. 되돌릴 수 없어요. 계속할까요?`)) return
    await eraseCards([card.id])
    toast('기록을 지웠습니다.')
  }

  const memberName = (id: string) => members.find((m) => m.id === id)?.name
  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name : undefined

  return (
    <>
      <Header
        title="양도 · 판매 내역"
        actions={
          (cards?.length ?? 0) > 0 && (
            <button
              className="icon-btn"
              onClick={() => setEditing((on) => !on)}
              aria-label={editing ? '편집 마치기' : '기록 편집'}
              aria-pressed={editing}
            >
              {editing ? <CloseIcon /> : <EditIcon />}
            </button>
          )
        }
      />

      <div className="content content--no-fab">
        <div className="subtabs" role="tablist" aria-label="처리 방식">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              role="tab"
              aria-selected={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {cards === undefined ? null : list.length === 0 ? (
          <div className="empty">
            <strong>아직 정리한 카드가 없어요</strong>
            <p>
              카드를 열어 삭제할 때 <b>양도함</b> 또는 <b>판매함</b>을 고르면
              <br />
              여기에 날짜와 함께 기록이 남습니다.
            </p>
          </div>
        ) : (
          <div className="history">
            {list.map((card) => (
              <HistoryRow
                key={card.id}
                card={card}
                member={memberName(card.memberId)}
                category={categoryName(card.categoryId)}
                editing={editing}
                onOpen={card.photoGone === 1 ? undefined : () => setOpenCard(card)}
                onErase={() => void erase(card)}
              />
            ))}
          </div>
        )}
      </div>

      {openCard && (
        <CardDetail
          card={openCard}
          siblings={openable}
          onNavigate={setOpenCard}
          onClose={() => setOpenCard(null)}
        />
      )}
    </>
  )
}

function HistoryRow({
  card,
  member,
  category,
  editing,
  onOpen,
  onErase,
}: {
  card: Card
  member?: string
  category?: string
  editing: boolean
  /** 없으면 누를 수 없는 줄이다 — 사진을 지운 기록 */
  onOpen?: () => void
  onErase: () => void
}) {
  const url = useObjectUrl(card.thumb, card.id)

  /*
   * 지우는 단추는 줄 안에 넣을 수 없다. 줄 자체가 단추라 단추 안의 단추가
   * 되기 때문이다. 그래서 줄과 나란히 놓고, 편집을 켰을 때만 자리를 낸다.
   */
  return (
    <div className="history__item" data-editing={editing || undefined}>
      <Row onOpen={onOpen}>
        <span className="history__thumb">{url && <img src={url} alt="" loading="lazy" />}</span>

        <span className="history__body">
          {/* 제목은 없을 수 있다. 그 자리를 비워두면 줄이 어긋나므로 메모로 채운다. */}
          <span className="history__title">{card.title || card.memo || '제목 없음'}</span>
          <span className="history__meta">
            {member && <b>{member}</b>}
            {SHOW_CATEGORY && category && <span>{category}</span>}
          </span>
        </span>

        <span className="history__side">
          <span className="history__badge" data-status={card.status}>
            {STATUS_LABEL[card.status]}
          </span>
          <span className="history__date">{formatDate(card.deletedAt ?? card.updatedAt)}</span>
        </span>
      </Row>

      {editing && (
        <button className="history__erase" onClick={onErase} aria-label="기록 지우기">
          <TrashIcon size={19} />
        </button>
      )}
    </div>
  )
}

/*
 * 같은 줄이지만 누를 수 있을 때만 단추다.
 *
 * 누를 수 없는 것을 disabled 단추로 두면 글자까지 흐려져 읽기 힘들어지고,
 * 그냥 단추로 두면 눌리는 시늉만 하고 아무 일도 없다. 태그를 바꾼다.
 */
function Row({ onOpen, children }: { onOpen?: () => void; children: ReactNode }) {
  if (!onOpen) return <div className="history__row">{children}</div>
  return (
    <button className="history__row" onClick={onOpen}>
      {children}
    </button>
  )
}
