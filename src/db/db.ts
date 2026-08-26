import Dexie, { type Table } from 'dexie'
import type { Card, Category, Member, StoredImage } from './types'

export class PocaDB extends Dexie {
  members!: Table<Member, string>
  categories!: Table<Category, string>
  cards!: Table<Card, string>
  images!: Table<StoredImage, string>

  constructor() {
    super('poca-archive')

    this.version(1).stores({
      members: 'id, name, order',
      categories: 'id, name, order',
      cards:
        'id, memberId, categoryId, createdAt, deleted, favorite, ' +
        '[deleted+createdAt], [memberId+deleted], [deleted+favorite]',
    })

    // v2: 본체 이미지를 별도 테이블로 뺀다.
    // v1에서는 카드 한 건을 읽을 때마다 1600px 원본까지 딸려 와서
    // 썸네일 그리드를 그리는 데도 수십 MB가 메모리에 올라왔다.
    this.version(2)
      .stores({
        members: 'id, name, order',
        categories: 'id, name, order',
        cards:
          'id, memberId, categoryId, createdAt, deleted, favorite, ' +
          '[deleted+createdAt], [memberId+deleted], [deleted+favorite]',
        images: 'cardId',
      })
      .upgrade(async (tx) => {
        const cards = tx.table('cards')
        const images = tx.table('images')
        const rows = await cards.toArray()
        for (const row of rows) {
          if (!row.image) continue
          await images.put({ cardId: row.id, blob: row.image })
          delete row.image
          await cards.put(row)
        }
      })
  }
}

export const db = new PocaDB()

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** 카드와 본체 이미지를 함께 지운다. 완전 삭제는 반드시 이걸 거쳐야 한다. */
export async function purgeCards(ids: string[]) {
  if (!ids.length) return
  await db.transaction('rw', db.cards, db.images, async () => {
    await db.cards.bulkDelete(ids)
    await db.images.bulkDelete(ids)
  })
}
