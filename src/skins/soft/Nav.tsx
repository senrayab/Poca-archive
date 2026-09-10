import { useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { GridIcon, HeartIcon, HistoryIcon, MenuIcon, PlusIcon } from '@/components/Icons'
import { setPendingFiles } from '@/lib/pendingFiles'

/**
 * 아래에 떠 있는 알약 탭바.
 *
 * 기본 차림은 햄버거로 서랍을 열어 길을 찾는다. 그건 갈 곳이 많을 때
 * 좋지만, 실제로 자주 가는 곳은 셋뿐이다 — 보관함, 좋아요, 내역. 셋을
 * 손가락이 닿는 아래쪽에 늘 꺼내두면 서랍을 열 일이 거의 없어진다.
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
  const pickRef = useRef<HTMLInputElement>(null)

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPendingFiles(files)
    navigate('/upload')
  }

  return (
    <>
      <nav className="softnav" aria-label="길찾기">
        <NavLink className="softnav__item" to="/" end>
          <GridIcon size={21} />
          <span>보관함</span>
        </NavLink>
        <NavLink className="softnav__item" to="/favorites">
          <HeartIcon size={21} />
          <span>좋아요</span>
        </NavLink>

        <button
          className="softnav__add"
          onClick={() => pickRef.current?.click()}
          aria-label="사진 올리기"
        >
          <PlusIcon size={26} />
        </button>

        <NavLink className="softnav__item" to="/history">
          <HistoryIcon size={21} />
          <span>내역</span>
        </NavLink>
        <button className="softnav__item" onClick={openDrawer}>
          <MenuIcon size={21} />
          <span>더보기</span>
        </button>
      </nav>

      <input ref={pickRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    </>
  )
}
