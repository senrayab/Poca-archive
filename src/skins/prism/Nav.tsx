import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 위에 붙박은 서리유리 한 줄.
 *
 * 아래에 두면 자리가 소프트·녹턴과 같아진다. 위로 올리면 손은 조금 멀지만,
 * 이 스킨에서 아래쪽은 카드가 슬리브에서 이어지는 자리라 비워두는 편이
 * 진열장답다.
 *
 * 한 줄에 다섯을 넣으면서 이름을 다 붙이면 글자만 남는다. 그래서 지금 있는
 * 자리에만 이름이 따라 나오고 나머지는 아이콘만 남는다 — 맑은 유리 알약이
 * 이름을 데리고 그 자리로 미끄러진다. 유리는 무엇이 앞에 있는지를 두께로
 * 말하는 물건이라, '지금 이것'도 한 겹 앞으로 나오는 것이 맞다.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="prznav" aria-label="길찾기">
      <NavLink className="prznav__item" to="/" end>
        <GridIcon size={19} />
        <span>보관함</span>
      </NavLink>
      <NavLink className="prznav__item" to="/favorites">
        <HeartIcon size={19} />
        <span>좋아요</span>
      </NavLink>

      <button
        className="prznav__item"
        onClick={() => navigate('/', { state: { find: Date.now() } })}
      >
        <SearchIcon size={19} />
        <span>검색</span>
      </button>
      <NavLink className="prznav__item" to="/more">
        <MenuIcon size={19} />
        <span>더보기</span>
      </NavLink>

      {/* 등록만 채워진 원이고 줄 끝에 선다. 생김새도 자리도 달라야 한다. */}
      <button className="prznav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={19} />
      </button>
    </nav>
  )
}
