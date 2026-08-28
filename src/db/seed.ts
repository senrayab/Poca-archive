import { db, uid } from './db'
import type { Category, Member } from './types'

/**
 * 초기 시드. 처음 켰을 때만 깔리고, 이후에는 앱에서 자유롭게 추가·수정·삭제한다.
 * 대표 색은 화면에 노출되지 않는다 — 통계 막대를 구분하는 용도라 여기서 정해둔다.
 */
const SEED_MEMBERS: Array<[string, string]> = [
  ['원빈', '#f5809f'],
  ['앤톤', '#5aa9f0'],
  ['유닛', '#63c9a4'],
]

const SEED_CATEGORIES = ['앨범', '팬사인회', '특전', '시즌그리팅', '트레카', '기타']

/**
 * 이전 시드로 이미 만들어진 기기에서 기본 멤버를 정리한다.
 * 카드가 한 장이라도 걸려 있으면 사용자가 쓰고 있다는 뜻이므로 건드리지 않는다.
 */
const RETIRED_MEMBERS = ['승한']

async function dropRetiredMembers() {
  for (const name of RETIRED_MEMBERS) {
    const member = await db.members.where('name').equals(name).first()
    if (!member) continue
    const cards = await db.cards.where('memberId').equals(member.id).count()
    if (cards === 0) await db.members.delete(member.id)
  }
}

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

  await dropRetiredMembers()
}
