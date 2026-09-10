import { useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { ChevronLeft, MenuIcon } from '@/components/Icons'
import type { HeaderView } from '../types'

/**
 * 기본 레이아웃의 머리.
 *
 * 왼쪽에 길 여는 단추, 가운데 이름, 오른쪽에 그 화면이 주는 일.
 * 흐린 바 하나로 위에 떠 있다.
 */
export function Header({ title, back = false, bare = false, actions }: HeaderView) {
  const { openDrawer } = useShell()
  const navigate = useNavigate()

  return (
    <header className="header" data-bare={bare || undefined}>
      {back ? (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft />
        </button>
      ) : (
        <button className="icon-btn" onClick={openDrawer} aria-label="메뉴 열기">
          <MenuIcon />
        </button>
      )}
      <h1 className="header__title">{title}</h1>
      {actions}
    </header>
  )
}
