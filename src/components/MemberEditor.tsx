import { useState } from 'react'
import { db, uid } from '@/db/db'
import type { Member } from '@/db/types'
import { Modal } from './Modal'
import { useToast } from './Toast'

const PRESET_COLORS = [
  '#f5b3c8',
  '#7aa2f7',
  '#9ece6a',
  '#e0af68',
  '#f7768e',
  '#bb9af7',
  '#7dcfff',
  '#ff9e64',
]

interface MemberEditorProps {
  /** 없으면 새 멤버 추가 */
  member?: Member
  onClose: () => void
}

export function MemberEditor({ member, onClose }: MemberEditorProps) {
  const toast = useToast()
  const [name, setName] = useState(member?.name ?? '')
  const [color, setColor] = useState(
    member?.color ?? PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return toast('이름을 입력해 주세요.')

    if (member) {
      await db.members.update(member.id, { name: trimmed, color })
      toast('멤버 정보를 수정했습니다.')
    } else {
      const last = await db.members.orderBy('order').last()
      await db.members.add({
        id: uid(),
        name: trimmed,
        color,
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

        <div className="field">
          <span>대표 색</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                aria-label={preset}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: preset,
                  outline: color === preset ? '2px solid var(--text)' : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="직접 고르기"
          />
        </div>

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
