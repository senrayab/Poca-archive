import { useState } from 'react'
import { db, uid } from '@/db/db'
import type { Member } from '@/db/types'
import { CHART_PALETTE } from '@/lib/palette'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface MemberEditorProps {
  /** 없으면 새 멤버 추가 */
  member?: Member
  onClose: () => void
}

export function MemberEditor({ member, onClose }: MemberEditorProps) {
  const toast = useToast()
  const [name, setName] = useState(member?.name ?? '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return toast('이름을 입력해 주세요.')

    if (member) {
      await db.members.update(member.id, { name: trimmed })
      toast('멤버 정보를 수정했습니다.')
    } else {
      const last = await db.members.orderBy('order').last()
      const count = await db.members.count()
      await db.members.add({
        id: uid(),
        name: trimmed,
        // 대표 색은 화면에 노출되지 않는다 — 통계 막대를 구분하는 용도라 순서대로 준다
        color: CHART_PALETTE[count % CHART_PALETTE.length],
        order: (last?.order ?? -1) + 1,
        createdAt: Date.now(),
      })
      toast(`'${trimmed}' 탭을 추가했습니다.`)
    }
    onClose()
  }

  return (
    <Modal onClose={onClose} label={member ? '멤버 수정' : '멤버 추가'}>
      <h2 className="modal__title">{member ? '멤버 수정' : '멤버 추가'}</h2>
      <form onSubmit={submit}>
        <label className="field">
          <span>이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 원빈, 그룹 단체, 굿즈"
            autoFocus
          />
        </label>

        <div className="row">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary">
            {member ? '저장' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
