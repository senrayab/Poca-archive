import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/AppShell'
import { CardDetail } from '@/components/CardDetail'
import { db } from '@/db/db'
import type { Card, CardStatus } from '@/db/types'
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

  const memberName = (id: string) => members.find((m) => m.id === id)?.name
  const categoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name : undefined

  return (
    <>
      <Header title="양도 · 판매 내역" />

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
                onOpen={() => setOpenCard(card)}
              />
            ))}
          </div>
        )}
      </div>

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

function HistoryRow({
  card,
  member,
  category,
  onOpen,
}: {
  card: Card
  member?: string
  category?: string
  onOpen: () => void
}) {
  const url = useObjectUrl(card.thumb)

  return (
    <button className="history__row" onClick={onOpen}>
      <span className="history__thumb">{url && <img src={url} alt="" loading="lazy" />}</span>

      <span className="history__body">
        <span className="history__title">{card.title}</span>
        <span className="history__meta">
          {member && <b>{member}</b>}
          {category && <span>{category}</span>}
        </span>
      </span>

      <span className="history__side">
        <span className="history__badge" data-status={card.status}>
          {STATUS_LABEL[card.status]}
        </span>
        <span className="history__date">{formatDate(card.deletedAt ?? card.updatedAt)}</span>
      </span>
    </button>
  )
}
