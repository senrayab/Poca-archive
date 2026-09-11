import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 페이지 번호처럼 늘어선 점들.
 *
 * 참고한 화면은 도록의 쪽번호를 옅은 알약에 담고 지금 쪽만 검게 두었다.
 * 길찾기도 같은 얼굴로 둔다 — 아이콘이 작은 점처럼 늘어서고 지금 자리만
 * 검게 찬다.
 *
 * 등록만 알약 밖에 따로 선다. 안에 넣으면 '가는 곳' 중 하나로 읽히는데,
 * 그건 가는 일이 아니라 더하는 일이다. 이 스킨에서 화면에 검은 것이 둘뿐인
 * 이유이기도 하다 — 지금 있는 자리, 그리고 더하는 단추.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="blnknav" aria-label="길찾기">
      <div className="blnknav__pages">
        <NavLink className="blnknav__item" to="/" end aria-label="보관함">
          <GridIcon size={16} />
        </NavLink>
        <NavLink className="blnknav__item" to="/favorites" aria-label="좋아요">
          <HeartIcon size={16} />
        </NavLink>
        <NavLink className="blnknav__item" to="/search" aria-label="검색">
          <SearchIcon size={16} />
        </NavLink>
        <NavLink className="blnknav__item" to="/more" aria-label="더보기">
          <MenuIcon size={16} />
        </NavLink>
      </div>

      <button className="blnknav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={16} />
      </button>
    </nav>
  )
}
