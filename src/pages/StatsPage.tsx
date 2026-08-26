import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/AppShell'
import { db } from '@/db/db'
import { useCategories, useMembers } from '@/hooks/useData'
import { formatBytes } from '@/lib/format'

export function StatsPage() {
  const members = useMembers()
  const categories = useCategories()

  const stats = useLiveQuery(async () => {
    const cards = await db.cards.toArray()
    const owned = cards.filter((c) => c.deleted === 0)

    const byMember = new Map<string, number>()
    const byCategory = new Map<string, number>()
    for (const card of owned) {
      byMember.set(card.memberId, (byMember.get(card.memberId) ?? 0) + 1)
      const key = card.categoryId ?? '__none__'
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1)
    }

    return {
      owned: owned.length,
      favorite: owned.filter((c) => c.favorite === 1).length,
      traded: cards.filter((c) => c.deleted === 1 && c.status === 'traded').length,
      sold: cards.filter((c) => c.deleted === 1 && c.status === 'sold').length,
      trash: cards.filter((c) => c.deleted === 1).length,
      bytes: cards.reduce((sum, c) => sum + c.bytes, 0),
      byMember,
      byCategory,
    }
  }, [])

  if (!stats) {
    return (
      <>
        <Header title="통계" back />
        <div className="content" />
      </>
    )
  }

  const max = Math.max(1, ...members.map((m) => stats.byMember.get(m.id) ?? 0))

  return (
    <>
      <Header title="통계" back />

      <div className="content">
        <div className="page">
          <div className="card-panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <Stat label="소장 중" value={`${stats.owned}장`} />
              <Stat label="즐겨찾기" value={`${stats.favorite}장`} />
              <Stat label="저장 용량" value={formatBytes(stats.bytes)} />
              <Stat label="양도함" value={`${stats.traded}장`} />
              <Stat label="판매함" value={`${stats.sold}장`} />
              <Stat label="휴지통" value={`${stats.trash}장`} />
            </div>
          </div>

          <h2>멤버별</h2>
          <div className="card-panel">
            {members.map((member) => {
              const count = stats.byMember.get(member.id) ?? 0
              return (
                <div key={member.id} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                  >
                    <span>{member.name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{count}장</span>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${(count / max) * 100}%`,
                        background: member.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {members.length === 0 && <p style={{ margin: 0 }}>등록된 멤버가 없습니다.</p>}
          </div>

          <h2>카테고리별</h2>
          <div className="card-panel">
            {categories.map((category) => (
              <div className="list-row" key={category.id} style={{ marginBottom: 6 }}>
                <span className="list-row__name">{category.name}</span>
                <span className="list-row__count">{stats.byCategory.get(category.id) ?? 0}장</span>
              </div>
            ))}
            <div className="list-row" style={{ marginBottom: 0 }}>
              <span className="list-row__name" style={{ color: 'var(--text-dim)' }}>
                분류 없음
              </span>
              <span className="list-row__count">{stats.byCategory.get('__none__') ?? 0}장</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
