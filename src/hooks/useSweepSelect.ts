import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Card } from '@/db/types'

/**
 * 꾹 눌러 쓸어 고르기.
 *
 * 스킨마다 격자를 제 손으로 그리게 되면서, 이 손짓이 기본 차림에만 남는
 * 일이 생겼다. 손짓은 생김새가 아니라 앱이 하는 일이므로 스킨을 가리면
 * 안 된다. 그래서 격자에서 떼어내 셋이 같이 쓰는 한 벌로 둔다.
 *
 * 쓰는 쪽은 두 가지만 지키면 된다 — 칸마다 data-card-id를 달 것,
 * 돌려받은 손잡이를 격자를 감싸는 요소에 그대로 얹을 것.
 */

/** 이만큼 누르고 있으면 고르기가 시작된다 */
const LONG_PRESS = 400
/** 그 전에 이만큼 움직이면 고르기가 아니라 넘기려던 손짓으로 본다 */
const MOVE_TOLERANCE = 10
/** 화면 위아래 이 안쪽까지 끌고 가면 목록이 따라 굴러간다 */
const EDGE = 88
const MAX_SPEED = 20

export interface SweepSelect {
  /** 격자를 감싸는 요소에 건다 (함수 ref라 요소가 늦게 생겨도 어긋나지 않는다) */
  ref: (el: HTMLDivElement | null) => void
  /** 그 요소에 그대로 펼쳐 얹는다 */
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
    onPointerUp: () => void
    onPointerCancel: () => void
  }
  /** 쓸고 있는 중인지 (화면이 따라 구르지 않게 표시로 쓴다) */
  dragging: boolean
  /** 길게 눌러 이미 골라진 뒤인지 — 칸이 또 뒤집지 않도록 물어본다 */
  handledByPress: () => boolean
}

export function useSweepSelect({
  cards,
  selectedIds,
  onSweep,
}: {
  cards: Card[]
  selectedIds?: Set<string>
  onSweep?: (next: Set<string>) => void
}): SweepSelect {
  const gridRef = useRef<HTMLDivElement | null>(null)
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
  /*
   * 격자가 나타나는 순간에 붙인다.
   *
   * 효과로 한 번만 붙이면 안 된다. 예전에는 이 손짓이 격자 컴포넌트 안에
   * 있어서 붙는 시점에 격자도 함께 있었는데, 지금은 화면이 이 훅을 부르고
   * 격자는 카드를 읽어온 뒤에야 생긴다. 그 사이에 효과가 먼저 돌면 붙일
   * 것이 없어 그냥 지나가고, 다시 돌 일이 없다.
   *
   * 그래서 ref 자체를 함수로 둔다. 리액트가 요소를 넘겨줄 때 붙이고
   * 거둘 때 뗀다 — 언제 생기든 어긋나지 않는다.
   */
  const hold = useRef((e: TouchEvent) => {
    if (draggingRef.current) e.preventDefault()
  })

  const setGrid = useCallback((el: HTMLDivElement | null) => {
    const prev = gridRef.current
    if (prev) prev.removeEventListener('touchmove', hold.current)
    gridRef.current = el
    if (el) el.addEventListener('touchmove', hold.current, { passive: false })
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

  return {
    ref: setGrid,
    handlers: { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop },
    dragging,
    handledByPress: () => draggingRef.current,
  }
}
