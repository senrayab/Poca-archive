import { NavLink, useNavigate } from 'react-router-dom'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 아래에 떠 있는 알약 탭바.
 *
 * 기본 차림은 햄버거로 서랍을 열어 길을 찾는다. 그건 갈 곳이 많을 때
 * 좋지만, 실제로 손이 자주 가는 것은 셋뿐이다 — 보관함, 좋아요, 검색.
 * 셋을 손가락이 닿는 아래쪽에 늘 꺼내두면 서랍을 열 일이 거의 없어진다.
 *
 * 내역은 여기 두지 않았다. 하루에 몇 번씩 여는 곳이 아니고, 더보기에서도
 * 한 번에 닿는다. 자리는 다섯뿐이니 자주 쓰는 것에 내준다.
 *
 * 이름은 적지 않는다. 그림 넷과 등록 하나뿐이라 줄이 조용하고, 자리가
 * 늘 같으므로 두어 번 쓰고 나면 이름을 읽을 일이 없다. 읽어주는 기능에는
 * aria-label로 남겨 둔다.
 *
 * 지금 있는 자리는 색이 아니라 '채워진 판'으로 알린다. 나머지는 그림뿐이라
 * 채워진 하나가 저절로 앞으로 나온다.
 *
 * 가운데 검은 동그라미는 등록이다. 다섯 자리 중 가운데라 어느 손으로도
 * 닿고, 다른 것과 생김새가 아예 달라 '이건 다른 일'이라고 말한다.
 * 나머지 갈 곳(멤버·통계·설정)은 오른쪽 끝에서 서랍으로 이어진다.
 */
export function Nav() {
  const navigate = useNavigate()

  return (
    <nav className="softnav" aria-label="길찾기">
      <NavLink className="softnav__item" to="/" end aria-label="보관함">
        <span className="softnav__well"><GridIcon size={21} /></span>
      </NavLink>
      <NavLink className="softnav__item" to="/favorites" aria-label="좋아요">
        <span className="softnav__well"><HeartIcon size={21} /></span>
      </NavLink>

      {/*
        등록 화면으로 간다.
        사진 고르기를 여기서 바로 열면 빠르긴 해도 그 길 하나만 남는다 —
        카메라로 찍어 올리는 길이 등록 화면에만 있어서, 눌러 놓고 취소한
        사람은 거기까지 가는 방법을 찾지 못한다. 문 하나만 열어준다.
      */}
      <button className="softnav__add" onClick={() => navigate('/upload')} aria-label="등록하기">
        <PlusIcon size={26} />
      </button>

      <NavLink className="softnav__item" to="/search" aria-label="검색">
        <span className="softnav__well"><SearchIcon size={21} /></span>
      </NavLink>
      {/*
        서랍이 아니라 페이지로 간다. 자주 가는 곳은 이미 이 줄에 나와
        있으므로 남은 것은 '가끔 가는 나머지'뿐인데, 그걸 보자고 화면을
        덮을 이유가 없다. 페이지면 여기가 지금 어디인지도 그대로 보인다.
      */}
      <NavLink className="softnav__item" to="/more" aria-label="더보기">
        <span className="softnav__well"><MenuIcon size={21} /></span>
      </NavLink>
    </nav>
  )
}
