import { db } from '@/db/db'
import { distance, fingerprintOf, SAME, SIMILAR, type Fingerprint } from './fingerprint'

/**
 * 이미 가진 카드와 같은 그림인지 찾는 일.
 *
 * 지문은 카드가 아니라 따로 둔 표에 있다. 그래서 몇 장을 가지고 있든 통째로
 * 읽어와 견주는 값이 거의 들지 않는다 — 한 줄에 열여섯 글자뿐이다.
 */

export interface Match {
  cardId: string
  /** 다른 비트 수. 0이면 완전히 같은 그림이다. */
  gap: number
}

/**
 * 아직 지문이 없는 카드의 것을 채운다.
 *
 * 마이그레이션에서 하지 않는 건, 지문을 뽑으려면 사진을 그려봐야 하는데 그
 * 기다림 사이에 트랜잭션이 닫혀 버리기 때문이다. 앱이 뜬 뒤 조용히 채운다.
 * 한 장에 10ms 안팎이라 수백 장이어도 몇 초면 끝나고, 한 번 채우면 그만이다.
 */
export async function backfillPrints() {
  const [ids, done] = await Promise.all([
    db.cards.toCollection().primaryKeys(),
    db.prints.toCollection().primaryKeys(),
  ])
  const have = new Set(done)
  const missing = ids.filter((id) => !have.has(id))
  if (!missing.length) return 0

  let made = 0
  for (const id of missing) {
    const card = await db.cards.get(id)
    if (!card) continue
    const fp = await fingerprintOf(card.thumb)
    if (!fp) continue
    await db.prints.put({ cardId: id, fp })
    made += 1
  }
  return made
}

/** 지문 표를 통째로 읽어온다 (가벼우므로 매번 새로 읽어도 된다) */
async function allPrints() {
  return db.prints.toArray()
}

/**
 * 이 지문과 닮은 카드를 가까운 순으로.
 *
 * within을 좁히면 다시 저장해 화질이 떨어진 사진을 놓치고, 넓히면 남남인
 * 카드가 걸린다. 등록을 막을 때는 좁게(SAME), 찾아볼 때는 넓게(SIMILAR) 쓴다.
 */
export async function findLike(fp: Fingerprint, within = SIMILAR): Promise<Match[]> {
  const rows = await allPrints()
  const hits: Match[] = []
  for (const row of rows) {
    const gap = distance(fp, row.fp)
    if (gap <= within) hits.push({ cardId: row.cardId, gap })
  }
  return hits.sort((a, b) => a.gap - b.gap)
}

/**
 * 등록하려는 사진들 중 이미 가진 것과 겹치는 게 있는지.
 *
 * 보관함에 있는 것뿐 아니라 이번에 함께 올리는 것들끼리도 견준다 —
 * 같은 카드를 두 번 찍어 넣는 일이 실제로 잦다.
 */
export interface Overlap<T> {
  item: T
  /** 보관함에서 찾은 같은 카드 (없으면 이번 묶음 안에서 겹친 것이다) */
  cardId?: string
  /** 이번 묶음 안에서 앞서 나온 것의 자리 */
  earlier?: number
}

export async function findOverlaps<T>(
  items: Array<{ item: T; fp: Fingerprint | null }>,
): Promise<Array<Overlap<T>>> {
  const rows = await allPrints()
  const found: Array<Overlap<T>> = []
  const seen: Array<{ fp: Fingerprint; at: number }> = []

  items.forEach(({ item, fp }, at) => {
    if (!fp) return

    const twin = seen.find((s) => distance(fp, s.fp) <= SAME)
    if (twin) {
      found.push({ item, earlier: twin.at })
      return
    }
    seen.push({ fp, at })

    let best: Match | null = null
    for (const row of rows) {
      const gap = distance(fp, row.fp)
      if (gap <= SAME && (!best || gap < best.gap)) best = { cardId: row.cardId, gap }
    }
    if (best) found.push({ item, cardId: best.cardId })
  })

  return found
}

export { fingerprintOf, SAME, SIMILAR }
