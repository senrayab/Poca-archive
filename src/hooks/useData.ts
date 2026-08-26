import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

export const useMembers = () =>
  useLiveQuery(() => db.members.orderBy('order').toArray(), [], [])

export const useCategories = () =>
  useLiveQuery(() => db.categories.orderBy('order').toArray(), [], [])

export interface CardFilter {
  memberId: string | null
  categoryId: string | null
  query: string
  favoriteOnly: boolean
  deleted: 0 | 1
}

export function useCards(filter: CardFilter) {
  const { memberId, categoryId, query, favoriteOnly, deleted } = filter

  return useLiveQuery(
    async () => {
      const rows = memberId
        ? await db.cards.where('[memberId+deleted]').equals([memberId, deleted]).toArray()
        : await db.cards.where('deleted').equals(deleted).toArray()

      const q = query.trim().toLowerCase()
      return rows
        .filter((c) => (categoryId ? c.categoryId === categoryId : true))
        .filter((c) => (favoriteOnly ? c.favorite === 1 : true))
        .filter((c) =>
          q ? `${c.title} ${c.memo}`.toLowerCase().includes(q) : true,
        )
        .sort((a, b) => b.createdAt - a.createdAt)
    },
    [memberId, categoryId, query, favoriteOnly, deleted],
    undefined,
  )
}

/** 멤버별 소장 장수 — 탭 뱃지와 통계 화면이 함께 쓴다. */
export function useCountsByMember() {
  return useLiveQuery(
    async () => {
      const rows = await db.cards.where('deleted').equals(0).toArray()
      const counts = new Map<string, number>()
      for (const row of rows) {
        counts.set(row.memberId, (counts.get(row.memberId) ?? 0) + 1)
      }
      return { counts, total: rows.length }
    },
    [],
    { counts: new Map<string, number>(), total: 0 },
  )
}

export const useTrashCount = () =>
  useLiveQuery(() => db.cards.where('deleted').equals(1).count(), [], 0)
