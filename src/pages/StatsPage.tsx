import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/AppShell'
import { Donut, type DonutSlice } from '@/components/Donut'
import { TagIcon, UsersIcon } from '@/components/Icons'
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
        <Header title="통계" />
        <div className="content content--no-fab" />
      </>
    )
  }

  const memberSlices: DonutSlice[] = members.map((member) => ({
    id: member.id,
    label: member.name,
    value: stats.byMember.get(member.id) ?? 0,
    color: member.color,
  }))

  /*
   * 카테고리는 고유 색이 없다. 포인트 색을 배경 쪽으로 조금씩 섞어 한 계열로
   * 만들면, 스킨이나 포인트 색을 바꿔도 화면과 따로 놀지 않는다.
   */
  const categorySlices: DonutSlice[] = [
    ...categories.map((category, index) => ({
      id: category.id,
      label: category.name,
      value: stats.byCategory.get(category.id) ?? 0,
      color: `color-mix(in srgb, var(--accent) ${Math.max(
        22,
        100 - index * 14,
      )}%, var(--bg-elev-2))`,
    })),
    {
      id: '__none__',
      label: '분류 없음',
      value: stats.byCategory.get('__none__') ?? 0,
      color: 'var(--line)',
    },
  ]

  return (
    <>
      <Header title="통계" />

      <div className="content content--no-fab">
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

          <h2>
            <UsersIcon size={15} />
            멤버별
          </h2>
          <div className="card-panel">
            {members.length === 0 ? (
              <p style={{ margin: 0 }}>등록된 멤버가 없습니다.</p>
            ) : (
              <Donut slices={memberSlices} centerLabel="장 소장" keepEmpty />
            )}
          </div>

          <h2>
            <TagIcon size={15} />
            카테고리별
          </h2>
          <div className="card-panel">
            <Donut slices={categorySlices} centerLabel="장 소장" />
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
