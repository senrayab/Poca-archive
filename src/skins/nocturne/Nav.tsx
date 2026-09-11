import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 오른쪽에 세로로 선 유리 기둥.
 *
 * 길찾기를 아래에 두는 건 흔한 자리다. 여기서는 옆에 세운다 — 이 스킨은
 * 화면 위아래를 사진에 통째로 내주기로 했고, 아래에 바를 깔면 그만큼
 * 사진이 잘린다. 옆으로 비키면 세로로는 끝까지 사진이 흐른다.
 *
 * 가운데 높이에 붙박아 둔 건 엄지가 가장 편히 닿는 자리라서다. 위나
 * 아래 끝에 붙이면 한 손으로 쥔 채 손을 옮겨야 한다.
 *
 * 지금 있는 자리는 색이 아니라 빛으로 알린다 — 아이콘 뒤에 옅은 원이
 * 켜진다. 어두운 화면에서는 칠하는 것보다 밝히는 쪽이 자연스럽다.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="noctrail" aria-label="길찾기">
      <NavLink className="noctrail__item" to="/" end aria-label="보관함">
        <GridIcon size={20} />
      </NavLink>
      <NavLink className="noctrail__item" to="/favorites" aria-label="좋아요">
        <HeartIcon size={20} />
      </NavLink>

      {/* 등록만 채워진 원이다. 나머지와 생김새가 달라야 다른 일로 읽힌다. */}
      <button className="noctrail__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={20} />
      </button>

      <button
        className="noctrail__item"
        onClick={() => navigate('/', { state: { find: Date.now() } })}
        aria-label="검색"
      >
        <SearchIcon size={20} />
      </button>
      <NavLink className="noctrail__item" to="/more" aria-label="더보기">
        <MenuIcon size={20} />
      </NavLink>
    </nav>
  )
}
