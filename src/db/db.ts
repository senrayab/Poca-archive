import Dexie, { type Table } from 'dexie'
import type { Card, Category, Member, StoredImage, StoredPrint } from './types'

export class PocaDB extends Dexie {
  members!: Table<Member, string>
  categories!: Table<Category, string>
  cards!: Table<Card, string>
  images!: Table<StoredImage, string>
  prints!: Table<StoredPrint, string>

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

    /*
     * v3: 사진 지문을 담을 표를 더한다.
     *
     * 기존 카드의 지문은 여기서 만들지 않는다. 지문을 뽑으려면 사진을 그려봐야
     * 하는데, 그 일을 마이그레이션 안에서 하면 트랜잭션이 먼저 닫혀 버린다.
     * 앱이 뜬 뒤 없는 것만 채운다 (lib/duplicates.ts).
     */
    this.version(3).stores({
      members: 'id, name, order',
      categories: 'id, name, order',
      cards:
        'id, memberId, categoryId, createdAt, deleted, favorite, ' +
        '[deleted+createdAt], [memberId+deleted], [deleted+favorite]',
      images: 'cardId',
      prints: 'cardId',
    })
  }
}

export const db = new PocaDB()

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** 카드와 딸린 것들을 함께 지운다. 완전 삭제는 반드시 이걸 거쳐야 한다. */
export async function purgeCards(ids: string[]) {
  if (!ids.length) return
  await db.transaction('rw', db.cards, db.images, db.prints, async () => {
    await db.cards.bulkDelete(ids)
    await db.images.bulkDelete(ids)
    await db.prints.bulkDelete(ids)
  })
}
