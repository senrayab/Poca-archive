import { memo } from 'react'
import type { Card } from '@/db/types'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { CheckIcon, HeartIcon } from './Icons'

interface ThumbProps {
  card: Card
  showTitle: boolean
  selectable: boolean
  selected: boolean
  onOpen: (card: Card) => void
  onToggleSelect: (card: Card) => void
}

const Thumb = memo(function Thumb({
  card,
  showTitle,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
}: ThumbProps) {
  const url = useObjectUrl(card.thumb, card.id)

  return (
    <button
      className="thumb"
      data-selected={selected}
      onClick={() => (selectable ? onToggleSelect(card) : onOpen(card))}
      onContextMenu={(e) => {
        // 길게 누르기 대신 우클릭/컨텍스트 메뉴로도 선택 모드에 들어갈 수 있게
        e.preventDefault()
        onToggleSelect(card)
      }}
      aria-label={card.title}
    >
      {url && <img src={url} alt="" loading="lazy" decoding="async" />}
      {selectable && (
        <span className="thumb__check" data-on={selected}>
          {selected && <CheckIcon size={13} />}
        </span>
      )}
      {card.favorite === 1 && !selectable && (
        <span className="thumb__fav">
          <HeartIcon size={15} filled />
        </span>
      )}
      {showTitle && <span className="thumb__label">{card.title}</span>}
    </button>
  )
})

interface CardGridProps {
  cards: Card[]
  showTitle?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onOpen: (card: Card) => void
  onToggleSelect?: (card: Card) => void
}

export function CardGrid({
  cards,
  showTitle = true,
  selectable = false,
  selectedIds,
  onOpen,
  onToggleSelect,
}: CardGridProps) {
  return (
    <div className="grid">
      {cards.map((card) => (
        <Thumb
          key={card.id}
          card={card}
          showTitle={showTitle}
          selectable={selectable}
          selected={selectedIds?.has(card.id) ?? false}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect ?? (() => {})}
        />
      ))}
    </div>
  )
}
