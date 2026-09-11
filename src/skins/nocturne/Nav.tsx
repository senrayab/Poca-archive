import { NavLink } from 'react-router-dom'
import { cls, useHere } from '../nav'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 아래에 떠 있는 어두운 유리 바.
 *
 * 처음에는 오른쪽에 세로로 세웠다. 세로로는 사진이 끝까지 흐른다는 게
 * 이유였는데, 실제로 써보니 사진이 옆에서 눌려 답답했다. 가로로 눕히면
 * 먹는 것은 아래 한 줄뿐이고, 그 줄은 어차피 손가락이 있는 자리다.
 *
 * 대신 위로 올라간 멤버 줄과 자리를 나눈다 — 위는 무엇을 볼지 고르는
 * 자리, 아래는 어디로 갈지 고르는 자리. 둘을 한쪽에 몰면 다시 답답해진다.
 *
 * 지금 있는 자리는 색이 아니라 빛으로 알린다. 아이콘 뒤에 옅은 원이
 * 켜진다 — 어두운 화면에서는 칠하는 것보다 밝히는 쪽이 자연스럽다.
 */
export function Nav() {
  const here = useHere()

  return (
    <nav className="noctnav" aria-label="길찾기">
      <NavLink className={cls('noctnav__item', here.archive)} to="/" end aria-label="보관함">
        <GridIcon size={21} />
      </NavLink>
      <NavLink className={cls('noctnav__item', here.favorites)} to="/favorites" aria-label="좋아요">
        <HeartIcon size={21} />
      </NavLink>

      {/* 등록만 채워진 원이다. 생김새가 달라야 다른 일로 읽힌다. */}
      <NavLink className={cls('noctnav__add', here.upload)} to="/upload" aria-label="등록하기">
        <PlusIcon size={22} />
      </NavLink>

      <NavLink className={cls('noctnav__item', here.search)} to="/search" aria-label="검색">
        <SearchIcon size={21} />
      </NavLink>
      <NavLink className={cls('noctnav__item', here.more)} to="/more" aria-label="더보기">
        <MenuIcon size={21} />
      </NavLink>
    </nav>
  )
}
