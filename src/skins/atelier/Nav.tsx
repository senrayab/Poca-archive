import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 아래 가운데에 떠 있는, 이어진 두 검은 알약.
 *
 * 앞의 셋(소프트·녹턴·프리즘)은 모두 좌우로 꽉 찬 바다. 여기서는 폭을
 * 다 쓰지 않는다 — 크림 종이가 넓게 남아야 종이로 읽히고, 검은 것이
 * 작을수록 검다.
 *
 * 둘로 나눈 건 하는 일이 다르기 때문이다. 왼쪽은 '어디로 갈까', 오른쪽은
 * '무엇을 더할까'. 붙여 두되 틈 하나로 갈라 놓으면 두 일이라는 게 보인다.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="atlnav" aria-label="길찾기">
      <div className="atlnav__go">
        <NavLink className="atlnav__item" to="/" end aria-label="보관함">
          <GridIcon size={19} />
        </NavLink>
        <NavLink className="atlnav__item" to="/favorites" aria-label="좋아요">
          <HeartIcon size={19} />
        </NavLink>
        <button
          className="atlnav__item"
          onClick={() => navigate('/', { state: { find: Date.now() } })}
          aria-label="검색"
        >
          <SearchIcon size={19} />
        </button>
        <NavLink className="atlnav__item" to="/more" aria-label="더보기">
          <MenuIcon size={19} />
        </NavLink>
      </div>

      <button className="atlnav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={19} />
      </button>
    </nav>
  )
}
