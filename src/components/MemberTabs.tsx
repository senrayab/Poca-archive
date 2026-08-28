import { useMembers } from '@/hooks/useData'
import { PlusIcon } from './Icons'

interface MemberTabsProps {
  selected: string | null
  onSelect: (memberId: string | null) => void
  onAddMember: () => void
}

/**
 * 멤버 탭. 그룹이 RIIZE로 고정돼 있지 않도록 맨 끝의 '+'로 언제든 사람을 추가한다.
 * (같은 목록을 서랍의 '멤버 관리'에서 이름·색·순서까지 편집할 수 있다.)
 *
 * 장수는 일부러 띄우지 않는다 — 이름을 읽는 게 먼저고, 숫자는 멤버 관리에서 본다.
 */
export function MemberTabs({ selected, onSelect, onAddMember }: MemberTabsProps) {
  const members = useMembers()

  return (
    <div className="tabs" role="tablist" aria-label="멤버">
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
          <span className="chip__dot" style={{ background: member.color }} />
          {member.name}
        </button>
      ))}

      <button className="chip chip--add" onClick={onAddMember} aria-label="멤버 추가">
        <PlusIcon size={16} />
      </button>
    </div>
  )
}
