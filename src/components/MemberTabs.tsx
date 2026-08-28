import { useEffect, useRef, useState } from 'react'
import { useMembers } from '@/hooks/useData'
import { PlusIcon } from './Icons'

interface MemberTabsProps {
  selected: string | null
  onSelect: (memberId: string | null) => void
  onAddMember: () => void
}

/**
 * 멤버 탭. 그룹이 RIIZE로 고정돼 있지 않도록 맨 끝의 '+'로 언제든 사람을 추가한다.
 * (같은 목록을 서랍의 '멤버 관리'에서 이름·순서까지 편집할 수 있다.)
 *
 * 장수는 일부러 띄우지 않는다 — 이름을 읽는 게 먼저고, 숫자는 멤버 관리에서 본다.
 */
export function MemberTabs({ selected, onSelect, onAddMember }: MemberTabsProps) {
  const members = useMembers()
  const railRef = useRef<HTMLDivElement>(null)
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

  return (
    <div className="tabs-wrap" data-start={edges.start} data-end={edges.end}>
      <div className="tabs" role="tablist" aria-label="멤버" ref={railRef}>
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

      <span className="tabs-fade tabs-fade--start" aria-hidden="true" />
      <span className="tabs-fade tabs-fade--end" aria-hidden="true" />
    </div>
  )
}
