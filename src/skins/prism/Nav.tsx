import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 아래에 떠 있는 서리유리 캡슐.
 *
 * 자리는 소프트·녹턴과 같다. 대신 지금 있는 자리를 알리는 방법이 다르다 —
 * 소프트는 검게 채우고 녹턴은 옅게 밝히는데, 여기서는 맑은 유리 알약이
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

      {/* 등록만 채워진 원이다. 생김새가 달라야 다른 일로 읽힌다. */}
      <button className="prznav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={21} />
      </button>

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
    </nav>
  )
}
