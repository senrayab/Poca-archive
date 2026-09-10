import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Card } from '@/db/types'
import { useObjectUrl } from '@/hooks/useObjectUrl'
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
  showFav = true,
  selectable = false,
  selectedIds,
  onOpen,
  onToggleSelect,
  onSweep,
}: CardGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  /*
   * 길게 눌러 고르기 시작하고, 누른 채로 쓸면 지나간 카드가 다 골라진다.
   *
   * 지나간 칸을 하나씩 칠하는 게 아니라, '시작한 칸부터 지금 칸까지'를 매번
   * 다시 계산한다. 그래야 손가락을 되돌렸을 때 방금 고른 것이 도로 풀린다 —
   * 칠하고 기억하는 방식으로는 지나온 자리를 되돌릴 방법이 없다.
   *
   * 고를지 풀지는 시작한 칸이 정한다. 안 골라진 칸에서 시작하면 고르고,
   * 이미 골라진 칸에서 시작하면 푼다. 그 방향은 쓸기가 끝날 때까지 그대로다.
   *
   * 손짓 판정은 칸 하나하나가 아니라 격자 전체가 맡는다. 칸마다 맡기면 손가락이
   * 칸을 벗어나는 순간 이벤트가 끊겨, 쓸고 지나가는 걸 이어서 볼 수가 없다.
   */
  const draggingRef = useRef(false)
  const press = useRef<{ pointerId: number; x: number; y: number; timer: number } | null>(null)
  /** 쓸기를 시작한 칸의 자리 */
  const anchor = useRef(-1)
  /** 손가락이 마지막으로 머문 칸의 자리 — 같은 칸이면 다시 셈하지 않는다 */
  const reached = useRef(-1)
  /** 쓸기를 시작하기 직전의 고름 상태. 되돌아온 자리는 여기로 돌아간다. */
  const before = useRef(new Set<string>())
  /** 이번 쓸기가 고르는 쪽인지 푸는 쪽인지 (시작한 칸이 정한다) */
  const sweepTo = useRef(true)
  /** 시작할 때의 고름 상태를 봐야 하므로 최신 값을 따로 들고 있는다 */
  const selectedRef = useRef(selectedIds)
  selectedRef.current = selectedIds
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const placeOf = useMemo(() => {
    const map = new Map<string, number>()
    cards.forEach((card, i) => map.set(card.id, i))
    return map
  }, [cards])
  const placeRef = useRef(placeOf)
  placeRef.current = placeOf
  const at = useRef({ x: 0, y: 0 })
  const speed = useRef(0)
  const frame = useRef(0)

  const cardAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)
    const thumb = el instanceof Element ? el.closest('[data-card-id]') : null
    return thumb instanceof HTMLElement ? (thumb.dataset.cardId ?? null) : null
  }

  /**
   * 시작한 칸부터 지금 칸까지를 한 덩어리로 보고 고름 상태를 다시 짠다.
   *
   * 그 바깥은 쓸기 전 상태로 되돌아간다. 손가락이 왔던 길을 되짚으면
   * 방금 고른 것들이 차례로 풀리는 게 이 때문이다.
   */
  const spanTo = (place: number) => {
    if (anchor.current < 0 || place < 0 || place === reached.current) return
    reached.current = place
    const from = Math.min(anchor.current, place)
    const to = Math.max(anchor.current, place)
    const next = new Set(before.current)
    for (let i = from; i <= to; i++) {
      const card = cardsRef.current[i]
      if (!card) continue
      if (sweepTo.current) next.add(card.id)
      else next.delete(card.id)
    }
    onSweep?.(next)
  }

  const paint = (x: number, y: number) => {
    const id = cardAt(x, y)
    if (!id) return
    const place = placeRef.current.get(id)
    if (place !== undefined) spanTo(place)
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
    anchor.current = -1
    reached.current = -1
    before.current.clear()
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
    if (!onSweep) return
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
        before.current = new Set(selectedRef.current ?? [])
        // 이미 골라진 칸에서 시작했으면 이번 쓸기는 푸는 쪽이다
        sweepTo.current = !before.current.has(id)
        anchor.current = placeRef.current.get(id) ?? -1
        reached.current = -1
        spanTo(anchor.current)
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
          showFav={showFav}
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
