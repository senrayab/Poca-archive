import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from '@/components/Icons'
import type { HeaderView } from '../types'

/**
 * 기본 레이아웃의 머리.
 *
 * 가운데 이름, 오른쪽에 그 화면이 주는 일. 흐린 바 하나로 위에 떠 있다.
 *
 * 왼쪽은 뒤로 가는 자리다. 예전에는 서랍을 여는 햄버거가 늘 거기 있었는데,
 * 갈 곳은 아래 길찾기로 내려갔다. 뒤로 갈 일이 없는 화면에서는 자리만
 * 잡아둔다 — 빈 칸이 없으면 이름이 왼쪽으로 밀려 화면마다 자리가 흔들린다.
 */
export function Header({ title, back = false, bare = false, actions }: HeaderView) {
  const navigate = useNavigate()

  return (
    <header className="header" data-bare={bare || undefined}>
      {back ? (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft />
        </button>
      ) : (
        <span className="header__gap" />
      )}
      <h1 className="header__title">{title}</h1>
      {actions}
    </header>
  )
}
