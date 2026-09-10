import { NavLink, useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { GridIcon, HeartIcon, MenuIcon, PlusIcon, SearchIcon } from '@/components/Icons'

/**
 * 아래에 떠 있는 알약 탭바.
 *
 * 기본 차림은 햄버거로 서랍을 열어 길을 찾는다. 그건 갈 곳이 많을 때
 * 좋지만, 실제로 손이 자주 가는 것은 셋뿐이다 — 보관함, 좋아요, 검색.
 * 셋을 손가락이 닿는 아래쪽에 늘 꺼내두면 서랍을 열 일이 거의 없어진다.
 *
 * 내역은 여기 두지 않았다. 하루에 몇 번씩 여는 곳이 아니고, 서랍에서도
 * 한 번에 닿는다. 자리는 다섯뿐이니 자주 쓰는 것에 내준다.
 *
 * 지금 있는 자리는 색이 아니라 '검은 알약'으로 알린다. 알약 안에서만
 * 이름이 나오므로, 나머지는 아이콘만 남아 줄이 조용하다.
 *
 * 가운데 검은 동그라미는 등록이다. 다섯 자리 중 가운데라 어느 손으로도
 * 닿고, 다른 것과 생김새가 아예 달라 '이건 다른 일'이라고 말한다.
 * 나머지 갈 곳(멤버·통계·설정)은 오른쪽 끝에서 서랍으로 이어진다.
 */
export function Nav() {
  const { openDrawer } = useShell()
  const navigate = useNavigate()

  return (
    <nav className="softnav" aria-label="길찾기">
      <NavLink className="softnav__item" to="/" end>
        <GridIcon size={21} />
        <span>보관함</span>
      </NavLink>
      <NavLink className="softnav__item" to="/favorites">
        <HeartIcon size={21} />
        <span>좋아요</span>
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

      {/*
        검색은 화면이 아니라 보관함 위에 뜨는 시트다. 그래서 자리를
        옮기는 게 아니라 '보관함으로 가서 시트를 연다'고 일러준다.
        주소에 흔적을 남기지 않으려고 state로 보낸다 — 새로고침하면
        그냥 보관함이지 검색이 열린 채로 되살아나지 않는다.
      */}
      <button
        className="softnav__item"
        onClick={() => navigate('/', { state: { find: Date.now() } })}
      >
        <SearchIcon size={21} />
        <span>검색</span>
      </button>
      <button className="softnav__item" onClick={openDrawer}>
        <MenuIcon size={21} />
        <span>더보기</span>
      </button>
    </nav>
  )
}
