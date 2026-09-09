import { memo, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
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
  /** 길게 눌러 고르는 중이면 여기서 또 뒤집지 않도록 물어본다 */
  handledByPress: () => boolean
}

const Thumb = memo(function Thumb({
  card,
  showTitle,
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
  /** 쓸어 지나간 카드를 고른다 (뒤집지 않고 고르기만 한다) */
  onSelect?: (ids: string[]) => void
}

/** 이만큼 누르고 있으면 고르기가 시작된다 */
const LONG_PRESS = 400
/** 그 전에 이만큼 움직이면 고르기가 아니라 넘기려던 손짓으로 본다 */
const MOVE_TOLERANCE = 10
/** 화면 위아래 이 안쪽까지 끌고 가면 목록이 따라 굴러간다 */
const EDGE = 88
const MAX_SPEED = 20

export function CardGrid({
  cards,
  showTitle = true,
  selectable = false,
  selectedIds,
  onOpen,
  onToggleSelect,
  onSelect,
}: CardGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  /*
   * 길게 눌러 고르기 시작하고, 누른 채로 쓸면 지나간 카드가 다 골라진다.
   *
   * 손짓 판정은 칸 하나하나가 아니라 격자 전체가 맡는다. 칸마다 맡기면 손가락이
   * 칸을 벗어나는 순간 이벤트가 끊겨, 쓸고 지나가는 걸 이어서 볼 수가 없다.
   */
  const draggingRef = useRef(false)
  const press = useRef<{ pointerId: number; x: number; y: number; timer: number } | null>(null)
  /** 이번에 쓸며 이미 고른 카드 — 같은 카드를 두 번 세지 않는다 */
  const painted = useRef(new Set<string>())
  const at = useRef({ x: 0, y: 0 })
  const speed = useRef(0)
  const frame = useRef(0)

  const cardAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)
    const thumb = el instanceof Element ? el.closest('[data-card-id]') : null
    return thumb instanceof HTMLElement ? (thumb.dataset.cardId ?? null) : null
  }

  const paint = (x: number, y: number) => {
    const id = cardAt(x, y)
    if (!id || painted.current.has(id)) return
    painted.current.add(id)
    onSelect?.([id])
  }

  /** 화면 끝에 손가락이 닿아 있으면 목록을 굴려 준다 — 안 그러면 보이는 만큼만 고를 수 있다 */
  const aim = (y: number) => {
    const overTop = y - EDGE
    const overBottom = window.innerHeight - EDGE - y
    speed.current =
      overTop < 0
        ? Math.max(-MAX_SPEED, overTop / 4)
        : overBottom < 0
          ? Math.min(MAX_SPEED, -overBottom / 4)
          : 0
    if (speed.current && !frame.current) frame.current = requestAnimationFrame(roll)
  }

  const roll = () => {
    frame.current = 0
    if (!draggingRef.current || !speed.current) return
    window.scrollBy(0, speed.current)
    // 목록이 움직였으니 손가락 밑의 카드도 달라졌다
    paint(at.current.x, at.current.y)
    frame.current = requestAnimationFrame(roll)
  }

  const stop = () => {
    if (press.current) {
      window.clearTimeout(press.current.timer)
      press.current = null
    }
    speed.current = 0
    if (frame.current) {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    }
    if (draggingRef.current) {
      draggingRef.current = false
      setDragging(false)
    }
    painted.current.clear()
  }

  useEffect(() => stop, [])

  /*
   * 쓸고 있는 동안에는 화면이 따라 스크롤되면 안 된다. touch-action만으로는
   * 이미 시작된 손짓을 되돌릴 수 없어, 브라우저에게 직접 하지 말라고 이른다.
   */
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const hold = (e: TouchEvent) => {
      if (draggingRef.current) e.preventDefault()
    }
    el.addEventListener('touchmove', hold, { passive: false })
    return () => el.removeEventListener('touchmove', hold)
  }, [])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!onSelect) return
    // 마우스는 왼쪽 단추만 (오른쪽은 종전대로 바로 고르기)
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const id = cardAt(e.clientX, e.clientY)
    if (!id) return

    const pointerId = e.pointerId
    at.current = { x: e.clientX, y: e.clientY }
    press.current = {
      pointerId,
      x: e.clientX,
      y: e.clientY,
      timer: window.setTimeout(() => {
        press.current = null
        painted.current = new Set([id])
        onSelect([id])
        draggingRef.current = true
        setDragging(true)
        gridRef.current?.setPointerCapture(pointerId)
        navigator.vibrate?.(8)
      }, LONG_PRESS),
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    at.current = { x: e.clientX, y: e.clientY }

    const waiting = press.current
    if (waiting && waiting.pointerId === e.pointerId) {
      // 아직 고르기가 시작되기 전이다. 움직였다면 넘기려던 손짓이니 물러난다.
      if (Math.hypot(e.clientX - waiting.x, e.clientY - waiting.y) > MOVE_TOLERANCE) {
        window.clearTimeout(waiting.timer)
        press.current = null
      }
      return
    }

    if (!draggingRef.current) return
    paint(e.clientX, e.clientY)
    aim(e.clientY)
  }

  return (
    <div
      className="grid"
      ref={gridRef}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      {cards.map((card) => (
        <Thumb
          key={card.id}
          card={card}
          showTitle={showTitle}
          selectable={selectable}
          selected={selectedIds?.has(card.id) ?? false}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect ?? (() => {})}
          handledByPress={() => draggingRef.current}
        />
      ))}
    </div>
  )
}
