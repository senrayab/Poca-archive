import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 젖빛 알약과 그 옆의 동그라미.
 *
 * 파스텔은 여태 왼쪽 위 햄버거로 서랍을 열었다. 서랍은 화면을 덮고 열리는
 * 것이라, 한 손으로 쥔 폰에서는 가장 먼 자리에서 가장 자주 눌리는 길이었다.
 * 다섯 스킨이 모두 아래로 내려온 뒤로는 파스텔만 혼자 위에 남아 있었다.
 *
 * 생김새는 파스텔이 원래 쓰던 재료 그대로다 — 젖빛 유리에 가장자리로
 * 분홍·파랑이 어리고, 아래로 그림자가 넓게 깔려 떠 있는 것처럼 보인다.
 * 다른 스킨들이 짜임으로 갈린다면 이 스킨은 재료로 갈린다.
 *
 * 등록만 알약 밖에 따로 선다. 가는 일이 아니라 더하는 일이라서다.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="pstnav" aria-label="길찾기">
      <div className="pstnav__bar">
        <NavLink className="pstnav__item" to="/" end aria-label="보관함">
          <GridIcon size={20} />
        </NavLink>
        <NavLink className="pstnav__item" to="/favorites" aria-label="좋아요">
          <HeartIcon size={20} />
        </NavLink>
        {/*
          검색은 가는 곳이 아니라 보관함에서 여는 것이라 NavLink가 아니다.
          state에 시각을 실어 보내면 같은 자리에 있어도 매번 새로 열린다.
        */}
        <button
          className="pstnav__item"
          onClick={() => navigate('/', { state: { find: Date.now() } })}
          aria-label="검색"
        >
          <SearchIcon size={20} />
        </button>
        <NavLink className="pstnav__item" to="/more" aria-label="더보기">
          <MenuIcon size={20} />
        </NavLink>
      </div>

      <button className="pstnav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={22} />
      </button>
    </nav>
  )
}
