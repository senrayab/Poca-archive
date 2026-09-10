import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CardDetail } from '@/components/CardDetail'
import { db } from '@/db/db'

/**
 * 자세히보기를 한 페이지로 여는 화면.
 *
 * 덮어 뜨는 층이 아니라 제 주소를 가진 화면이라, 폰의 뒤로가기가 저절로
 * 맞아떨어진다. 층을 세어 히스토리를 손보던 일도 여기서는 없다.
 *
 * 옆으로 넘길 목록은 보관함의 기본 차례(최근 등록 순)를 쓴다. 목록에서
 * 걸어둔 멤버나 검색어까지 물려받게 하려면 그 상태를 주소에 실어야 하는데,
 * 주소가 길어지는 값에 견주면 얻는 게 적다 — 넘기다 끝에 닿으면 그만이다.
 */
export function CardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const card = useLiveQuery(() => (id ? db.cards.get(id) : undefined), [id])
  // 버린 카드는 버린 것끼리, 가진 카드는 가진 것끼리 넘긴다
  const bin = card?.deleted ?? 0
  const rows = useLiveQuery(() => db.cards.where('deleted').equals(bin).toArray(), [bin])

  const siblings = useMemo(
    () => (rows ?? []).slice().sort((a, b) => b.createdAt - a.createdAt),
    [rows],
  )

  // 아직 읽는 중과 없는 것을 갈라야 한 번 깜빡이지 않는다
  if (card === undefined) return null
  if (!card) return <Navigate to="/" replace />

  return (
    <CardDetail
      page
      card={card}
      siblings={siblings}
      /* 넘길 때는 자리를 갈아끼운다 — 뒤로가기 한 번에 목록으로 돌아가야 한다 */
      onNavigate={(next) => navigate(`/card/${next.id}`, { replace: true })}
      onClose={() => navigate(-1)}
    />
  )
}
