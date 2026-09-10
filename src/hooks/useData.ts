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
      /*
       * 휴지통에서는 '사진을 지우고 기록만 남긴 것'을 뺀다. 비운 것이 도로
       * 보이면 비운 것이 아니다. 그런 카드는 양도·판매 내역에만 남는다.
       */
      const rows = memberId
        ? await db.cards.where('[memberId+deleted]').equals([memberId, deleted]).toArray()
        : deleted === 1
          ? await db.cards.where('[deleted+photoGone]').equals([1, 0]).toArray()
          : await db.cards.where('deleted').equals(deleted).toArray()

      const q = query.trim().toLowerCase()
      return rows
        .filter((c) => (deleted === 1 ? !c.photoGone : true))
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

/**
 * 멤버별 소장 장수 — 서랍과 멤버 관리 화면이 함께 쓴다.
 *
 * 예전엔 카드 행을 전부 읽어 세었는데, 행에는 썸네일 Blob이 붙어 있어
 * 서랍이 늘 떠 있는 이상 카드에 쓰기가 생길 때마다 보관함 전체가
 * 메모리에 다시 올라왔다. 세기만 하면 되는 일이라 인덱스 count로 바꾼다 —
 * IndexedDB가 인덱스 항목만 훑고 레코드는 아예 읽지 않는다.
 */
export function useCountsByMember() {
  return useLiveQuery(
    async () => {
      const members = await db.members.toArray()
      const entries = await Promise.all(
        members.map(
          async (member) =>
            [
              member.id,
              await db.cards.where('[memberId+deleted]').equals([member.id, 0]).count(),
            ] as const,
        ),
      )
      return {
        counts: new Map(entries),
        total: await db.cards.where('deleted').equals(0).count(),
      }
    },
    [],
    { counts: new Map<string, number>(), total: 0 },
  )
}

/*
 * 색인으로 센다. 행을 읽으면 딸린 썸네일까지 메모리에 올라오는데, 이 값은
 * 서랍에 늘 떠 있어 카드에 쓰기가 생길 때마다 그 일이 되풀이된다.
 */
export const useTrashCount = () =>
  useLiveQuery(() => db.cards.where('[deleted+photoGone]').equals([1, 0]).count(), [], 0)
