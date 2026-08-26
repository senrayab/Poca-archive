import { db, uid } from './db'
import type { Category, Member } from './types'

/** 초기 시드. 멤버는 앱에서 '+'로 얼마든지 추가·수정·삭제할 수 있다. */
const SEED_MEMBERS: Array<[string, string]> = [
  ['쇼타로', '#7aa2f7'],
  ['은석', '#9ece6a'],
  ['성찬', '#e0af68'],
  ['원빈', '#f7768e'],
  ['승한', '#bb9af7'],
  ['소희', '#7dcfff'],
  ['앤톤', '#ff9e64'],
]

const SEED_CATEGORIES = ['앨범', '팬사인회', '특전', '시즌그리팅', '트레카', '기타']

export async function seedIfEmpty() {
  const now = Date.now()

  if ((await db.members.count()) === 0) {
    const members: Member[] = SEED_MEMBERS.map(([name, color], order) => ({
      id: uid(),
      name,
      color,
      order,
      createdAt: now + order,
    }))
    await db.members.bulkAdd(members)
  }

  if ((await db.categories.count()) === 0) {
    const categories: Category[] = SEED_CATEGORIES.map((name, order) => ({
      id: uid(),
      name,
      order,
      createdAt: now + order,
    }))
    await db.categories.bulkAdd(categories)
  }
}
