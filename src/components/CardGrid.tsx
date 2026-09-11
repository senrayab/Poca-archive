import { memo } from 'react'
import type { Card } from '@/db/types'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSweepSelect } from '@/hooks/useSweepSelect'
import { CheckIcon, HeartIcon } from './Icons'

interface ThumbProps {
  card: Card
  showTitle: boolean
  showFav: boolean
  selectable: boolean
  selected: boolean
  onOpen: (card: Card) => void
  onToggleSelect: (card: Card) => void
  /** 길게 눌러 고르는 중이면 여기서 또 뒤집지 않도록 물어본다 */
  handledByPress: () => boolean
}

const Thumb = memo(function Thumb({
  card,
  showTitle,
  showFav,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
  handledByPress,
}: ThumbProps) {
  const url = useObjectUrl(card.thumb, card.id)

  return (
    <button
      className="thumb"
      data-card-id={card.id}
      data-selected={selected}
      onClick={() => (selectable ? onToggleSelect(card) : onOpen(card))}
      onContextMenu={(e) => {
        // 길게 누르면 폰이 사진 저장 메뉴를 띄우므로 어느 경우든 막는다
        e.preventDefault()
        // 손가락으로 길게 누른 거라면 이미 골라졌다 — 여기서 또 뒤집으면 도로 풀린다
        if (handledByPress()) return
        onToggleSelect(card)
      }}
      aria-label={card.title || card.memo || '포토카드'}
    >
      {url && <img src={url} alt="" loading="lazy" decoding="async" />}
      {selectable && (
        <span className="thumb__check" data-on={selected}>
          {selected && <CheckIcon size={13} />}
        </span>
      )}
      {card.favorite === 1 && showFav && !selectable && (
        <span className="thumb__fav">
          <HeartIcon size={15} filled />
        </span>
      )}
      {/*
        목록에서는 사진만 보이게 제목을 감춰 둔다.
        되살리려면 위의 SHOW_TITLE을 true로 바꾸면 된다 — 자리도 스타일도 그대로 있다.
      */}
      {SHOW_TITLE && showTitle && <span className="thumb__label">{card.title}</span>}
    </button>
  )
})

interface CardGridProps {
  cards: Card[]
  showTitle?: boolean
  /*
   * 찜한 것만 모아 보는 화면에서는 끈다.
   *
   * 하트는 '이건 찜한 것'이라고 알리는 표시인데, 죄다 찜한 것뿐인 자리에서는
   * 아무것도 가르지 못하면서 칸마다 하나씩 붙어 눈만 어지럽힌다. 모두에게
   * 붙는 표시는 표시가 아니다.
   */
  showFav?: boolean
  selectable?: boolean
  selectedIds?: Set<string>
  onOpen: (card: Card) => void
  onToggleSelect?: (card: Card) => void
  /** 쓰는 동안 바뀐 고름 상태를 통째로 넘긴다 (되돌아온 자리까지 반영된 결과다) */
  onSweep?: (next: Set<string>) => void
}

/*
 * 칸 아래 제목을 보일지.
 *
 * 목록에서는 사진만 보고 싶다고 해서 꺼 두었다. 지우지 않고 스위치로 둔 건
 * 나중에 되살릴 수 있게 하려는 것이다 — 이 한 줄만 true로 바꾸면 제목이
 * 다시 나온다. 넘겨받는 showTitle 값은 그대로 살아 있어 화면별로 다르게
 * 두는 길도 열려 있다.
 */
const SHOW_TITLE = false

export function CardGrid({
  cards,
  showTitle = true,
  showFav = true,
  selectable = false,
  selectedIds,
  onOpen,
  onToggleSelect,
  onSweep,
}: CardGridProps) {
  const sweep = useSweepSelect({ cards, selectedIds, onSweep })

  return (
    <div
      className="grid"
      ref={sweep.ref}
      data-dragging={sweep.dragging || undefined}
      {...sweep.handlers}
    >
      {cards.map((card) => (
        <Thumb
          key={card.id}
          card={card}
          showTitle={showTitle}
          showFav={showFav}
          selectable={selectable}
          selected={selectedIds?.has(card.id) ?? false}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect ?? (() => {})}
          handledByPress={sweep.handledByPress}
        />
      ))}
    </div>
  )
}
