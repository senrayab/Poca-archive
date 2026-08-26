import { useState } from 'react'
import { Header, useShell } from '@/components/AppShell'
import { EditIcon, PlusIcon, TrashIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import type { Category } from '@/db/types'
import { useCategories, useCountsByMember, useMembers } from '@/hooks/useData'

export function MembersPage() {
  const { openMemberEditor } = useShell()
  const toast = useToast()
  const members = useMembers()
  const categories = useCategories()
  const { counts } = useCountsByMember()
  const [newCategory, setNewCategory] = useState('')

  const move = async (id: string, direction: -1 | 1) => {
    const index = members.findIndex((m) => m.id === id)
    const swapWith = members[index + direction]
    if (!swapWith) return
    const current = members[index]
    await db.transaction('rw', db.members, async () => {
      await db.members.update(current.id, { order: swapWith.order })
      await db.members.update(swapWith.id, { order: current.order })
    })
  }

  const removeMember = async (id: string, name: string) => {
    // 휴지통에 있는 카드까지 포함해서 확인해야 고아 레코드가 안 생긴다.
    const owned = await db.cards.where('memberId').equals(id).count()
    if (owned > 0) {
      return toast(`'${name}'에 카드 ${owned}장이 남아 있어요. 먼저 옮기거나 삭제해 주세요.`)
    }
    if (!confirm(`'${name}' 탭을 삭제할까요?`)) return
    await db.members.delete(id)
    toast('삭제했습니다.')
  }

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    if (categories.some((c) => c.name === name)) return toast('이미 있는 카테고리예요.')
    const last = await db.categories.orderBy('order').last()
    await db.categories.add({
      id: uid(),
      name,
      order: (last?.order ?? -1) + 1,
      createdAt: Date.now(),
    })
    setNewCategory('')
  }

  const renameCategory = async (category: Category) => {
    const name = prompt('카테고리 이름', category.name)?.trim()
    if (!name || name === category.name) return
    await db.categories.update(category.id, { name })
  }

  const removeCategory = async (category: Category) => {
    const used = await db.cards.where('categoryId').equals(category.id).count()
    if (!confirm(
      used > 0
        ? `'${category.name}'을(를) 삭제하면 카드 ${used}장의 분류가 '없음'이 됩니다. 계속할까요?`
        : `'${category.name}'을(를) 삭제할까요?`,
    )) {
      return
    }
    await db.transaction('rw', db.cards, db.categories, async () => {
      const affected = await db.cards.where('categoryId').equals(category.id).toArray()
      for (const card of affected) {
        await db.cards.update(card.id, { categoryId: null })
      }
      await db.categories.delete(category.id)
    })
    toast('삭제했습니다.')
  }

  return (
    <>
      <Header title="멤버 · 카테고리 관리" back />

      <div className="content">
        <div className="page">
          <h2>멤버</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>
            탭 순서대로 보관함 상단에 나옵니다. 그룹이 바뀌거나 다른 아티스트를 모으게 되면
            여기서 자유롭게 추가하세요.
          </p>

          {members.map((member, index) => (
            <div className="list-row" key={member.id}>
              <span
                className="chip__dot"
                style={{ background: member.color, width: 12, height: 12 }}
              />
              <span className="list-row__name">{member.name}</span>
              <span className="list-row__count">{counts.get(member.id) ?? 0}장</span>
              <button
                className="icon-btn"
                onClick={() => move(member.id, -1)}
                disabled={index === 0}
                aria-label="위로"
                style={{ opacity: index === 0 ? 0.3 : 1 }}
              >
                ↑
              </button>
              <button
                className="icon-btn"
                onClick={() => move(member.id, 1)}
                disabled={index === members.length - 1}
                aria-label="아래로"
                style={{ opacity: index === members.length - 1 ? 0.3 : 1 }}
              >
                ↓
              </button>
              <button
                className="icon-btn"
                onClick={() => openMemberEditor(member)}
                aria-label="수정"
              >
                <EditIcon size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={() => removeMember(member.id, member.name)}
                aria-label="삭제"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          ))}

          <button className="btn btn--block" onClick={() => openMemberEditor()}>
            <PlusIcon size={18} />
            멤버 추가
          </button>

          <h2>카테고리</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>
            앨범·팬사인회·특전처럼 카드를 얻은 경로로 나눠두면 나중에 찾기 쉬워요.
          </p>

          {categories.map((category) => (
            <div className="list-row" key={category.id}>
              <span className="list-row__name">{category.name}</span>
              <button
                className="icon-btn"
                onClick={() => renameCategory(category)}
                aria-label="이름 바꾸기"
              >
                <EditIcon size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={() => removeCategory(category)}
                aria-label="삭제"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          ))}

          <form onSubmit={addCategory} className="row">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="새 카테고리 이름"
              style={{
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--line)',
                background: 'var(--bg-elev-2)',
              }}
            />
            <button type="submit" className="btn" style={{ flex: '0 0 auto' }}>
              <PlusIcon size={18} />
              추가
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
