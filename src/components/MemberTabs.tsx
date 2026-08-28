import { useEffect, useRef, useState } from 'react'
import { useMembers } from '@/hooks/useData'
import { PlusIcon } from './Icons'

interface MemberTabsProps {
  selected: string | null
  onSelect: (memberId: string | null) => void
  onAddMember: () => void
}

/** 끝에서 더 끌었을 때 밀려나는 최대 거리 */
const MAX_PULL = 56
/** 끌리는 정도. 1이면 그대로 따라오고, 작을수록 뻑뻑하다 */
const PULL_RATIO = 0.28

/**
 * 멤버 탭. 그룹이 RIIZE로 고정돼 있지 않도록 맨 끝의 '+'로 언제든 사람을 추가한다.
 * (같은 목록을 서랍의 '멤버 관리'에서 이름·순서까지 편집할 수 있다.)
 *
 * 장수는 일부러 띄우지 않는다 — 이름을 읽는 게 먼저고, 숫자는 멤버 관리에서 본다.
 */
export function MemberTabs({ selected, onSelect, onAddMember }: MemberTabsProps) {
  const members = useMembers()
  const railRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // 양쪽 끝에 가려진 탭이 있는지. 있는 쪽만 그라데이션을 덮는다.
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth
      // 소수점 오차로 끝에서도 1px쯤 남는 브라우저가 있어 여유를 둔다
      setEdges({ start: rail.scrollLeft > 2, end: rail.scrollLeft < max - 2 })
    }

    update()
    rail.addEventListener('scroll', update, { passive: true })
    // 화면 폭이 바뀌면 가려지는 범위도 달라진다
    const observer = new ResizeObserver(update)
    observer.observe(rail)

    return () => {
      rail.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [members.length])

  /*
   * 끝까지 간 뒤에도 계속 밀면 레일이 조금 따라 나왔다가 통통 튀며 돌아온다.
   *
   * 터치 기기는 브라우저가 이미 같은 감촉을 주므로 휠(마우스·트랙패드)에만 건다.
   * 스프링은 제자리를 한 번 지나쳤다가 돌아오게 맞췄다 — 그래야 그냥
   * 미끄러져 멈추는 게 아니라 '튕겼다'는 느낌이 난다.
   */
  useEffect(() => {
    const rail = railRef.current
    const inner = innerRef.current
    if (!rail || !inner) return

    let pull = 0
    let velocity = 0
    let frame = 0

    const draw = () => {
      inner.style.transform = pull ? `translateX(${-pull}px)` : ''
    }

    const settle = () => {
      cancelAnimationFrame(frame)
      const step = () => {
        // 감쇠 0.62 / 탄성 0.26 — 40px 끌었을 때 6px쯤 되튕겼다가 잦아든다
        velocity = (velocity - pull * 0.26) * 0.62
        pull += velocity
        if (Math.abs(pull) < 0.3 && Math.abs(velocity) < 0.3) {
          pull = 0
          velocity = 0
          draw()
          return
        }
        draw()
        frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }

    let releaseTimer = 0
    const scheduleSettle = () => {
      clearTimeout(releaseTimer)
      // 휠은 '뗐다'는 신호가 없어서 잠깐 멈춘 것을 손 뗀 것으로 본다
      releaseTimer = window.setTimeout(settle, 90)
    }

    const onWheel = (event: WheelEvent) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      const delta = horizontal ? event.deltaX : event.deltaY
      if (!delta) return

      const max = rail.scrollWidth - rail.clientWidth
      if (max <= 0) return

      const atStart = rail.scrollLeft <= 0
      const atEnd = rail.scrollLeft >= max - 1

      if ((atStart && delta < 0) || (atEnd && delta > 0)) {
        event.preventDefault()
        cancelAnimationFrame(frame)
        // 끝에서 멀어질수록 덜 밀리게 해 고무줄처럼 팽팽해진다
        const resistance = 1 - Math.min(1, Math.abs(pull) / MAX_PULL) * 0.75
        pull = Math.max(-MAX_PULL, Math.min(MAX_PULL, pull + delta * PULL_RATIO * resistance))
        velocity = 0
        draw()
        scheduleSettle()
        return
      }

      // 세로 휠만 굴려도 가로로 움직이게 (가로 휠이 없는 마우스 대응)
      if (!horizontal) {
        event.preventDefault()
        rail.scrollLeft += delta
      }
      if (pull) scheduleSettle()
    }

    rail.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      rail.removeEventListener('wheel', onWheel)
      clearTimeout(releaseTimer)
      cancelAnimationFrame(frame)
    }
  }, [])

  // 고른 탭이 가려져 있으면 가운데로 데려온다
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const active = rail.querySelector<HTMLElement>('[aria-selected="true"]')
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selected])

  return (
    <div className="tabs-wrap" data-start={edges.start} data-end={edges.end}>
      <div className="tabs" role="tablist" aria-label="멤버" ref={railRef}>
        <div className="tabs__inner" ref={innerRef}>
          <button
            role="tab"
            className="chip"
            aria-selected={selected === null}
            onClick={() => onSelect(null)}
          >
            전체
          </button>

          {members.map((member) => (
            <button
              key={member.id}
              role="tab"
              className="chip"
              aria-selected={selected === member.id}
              onClick={() => onSelect(member.id)}
            >
              {member.name}
            </button>
          ))}

          <button className="chip chip--add" onClick={onAddMember} aria-label="멤버 추가">
            <PlusIcon size={16} />
          </button>
        </div>
      </div>

      <span className="tabs-fade tabs-fade--start" aria-hidden="true" />
      <span className="tabs-fade tabs-fade--end" aria-hidden="true" />
    </div>
  )
}
