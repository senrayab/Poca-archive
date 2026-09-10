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

    /*
     * v4: '사진은 지웠고 기록만 남은 카드'를 가릴 표를 더한다.
     *
     * 휴지통 장수는 서랍에 늘 떠 있어, 셀 때 행을 읽으면 딸린 썸네일까지
     * 메모리에 올라온다. 그래서 색인으로 세야 하고, 색인으로 세려면
     * photoGone이 모든 행에 있어야 한다 — 없는 값은 색인이 아예 건너뛴다.
     * 그래서 여기서 기존 행에 0을 심는다. 사진을 만질 일이 없는 순수한
     * 값 쓰기라 트랜잭션 안에서 해도 안전하다.
     */
    this.version(4)
      .stores({
        members: 'id, name, order',
        categories: 'id, name, order',
        cards:
          'id, memberId, categoryId, createdAt, deleted, favorite, ' +
          '[deleted+createdAt], [memberId+deleted], [deleted+favorite], [deleted+photoGone]',
        images: 'cardId',
        prints: 'cardId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('cards')
          .toCollection()
          .modify((card) => {
            card.photoGone = 0
          })
      })
  }
}

export const db = new PocaDB()

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/**
 * 카드와 딸린 것을 통째로 지운다. 남는 것이 없다.
 *
 * 양도·판매 내역에서 기록 자체를 지울 때 쓴다. 휴지통 비우기는 이걸
 * 바로 부르지 않는다 — 아래 purgeCards를 보라.
 */
export async function eraseCards(ids: string[]) {
  if (!ids.length) return
  await db.transaction('rw', db.cards, db.images, db.prints, async () => {
    await db.cards.bulkDelete(ids)
    await db.images.bulkDelete(ids)
    await db.prints.bulkDelete(ids)
  })
}

/**
 * 휴지통에서 완전 삭제. 양도·판매한 것은 기록을 남긴다.
 *
 * 휴지통과 양도·판매 내역은 같은 행을 다르게 보는 두 화면이다. 그래서
 * 예전에는 휴지통을 비우면 내역까지 통째로 비었다. 하지만 두 화면이 담은
 * 뜻은 다르다 — 휴지통은 '되돌릴 수 있는 임시 보관'이고, 내역은 '무엇을
 * 언제 넘겼나'다. 뒤엣것은 사진이 없어져도 남아야 할 기록이다.
 *
 * 그래서 자리를 차지하는 것과 뜻을 지니는 것을 가른다. 원본 사진과 지문은
 * 지우고(용량의 거의 전부다), 행과 작은 썸네일은 남긴다. 남은 행은
 * photoGone 표가 서므로 휴지통 목록에서는 빠지고 내역에만 보인다.
 *
 * 기록까지 지우고 싶으면 내역 화면에서 지운다 — 그쪽은 eraseCards로 간다.
 */
export async function purgeCards(ids: string[]) {
  if (!ids.length) return
  await db.transaction('rw', db.cards, db.images, db.prints, async () => {
    const rows = await db.cards.bulkGet(ids)
    const keep = rows
      .filter((row): row is Card => Boolean(row) && (row!.status === 'traded' || row!.status === 'sold'))
      .map((row) => row.id)
    const keepSet = new Set(keep)

    await db.cards.bulkDelete(ids.filter((id) => !keepSet.has(id)))
    if (keep.length) {
      const now = Date.now()
      await db.cards
        .where('id')
        .anyOf(keep)
        .modify((card) => {
          card.photoGone = 1
          // 원본이 나갔으니 차지하는 자리도 남은 썸네일만큼이다
          card.bytes = card.thumb.size
          card.updatedAt = now
        })
    }
    // 남긴 행이든 지운 행이든, 자리를 차지하던 것은 모두 나간다
    await db.images.bulkDelete(ids)
    await db.prints.bulkDelete(ids)
  })
}
