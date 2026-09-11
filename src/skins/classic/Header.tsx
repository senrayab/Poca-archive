import type { ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BackupIcon,
  ChartIcon,
  ChevronLeft,
  GridIcon,
  HeartIcon,
  HistoryIcon,
  MenuIcon,
  SettingsIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
} from '@/components/Icons'
import type { HeaderView } from '../types'

/**
 * 화면마다 붙는 그림표.
 *
 * 제목만 있던 자리다. 예전에는 그 왼쪽이 서랍을 여는 햄버거였는데, 갈 곳이
 * 아래 길찾기로 내려가면서 빈 칸만 남았다. 그 칸에 지금 화면의 그림을
 * 넣는다 — 더보기 목록에 있는 것과 같은 그림이라, 거기서 고른 것이 여기로
 * 이어진다는 게 눈으로 보인다.
 *
 * 주소로 고르는 건 화면들이 제목만 넘겨주기 때문이다. 화면마다 그림까지
 * 넘기게 하면 여섯 스킨 중 이 하나를 위해 나머지 다섯이 쓰지도 않는 값을
 * 들고 다녀야 한다.
 */
const ICONS: Array<[string, ReactElement]> = [
  ['/favorites', <HeartIcon size={20} />],
  ['/trash', <TrashIcon size={20} />],
  ['/upload', <UploadIcon size={20} />],
  ['/members', <UsersIcon size={20} />],
  ['/history', <HistoryIcon size={20} />],
  ['/stats', <ChartIcon size={20} />],
  ['/settings', <SettingsIcon size={20} />],
  ['/manage', <BackupIcon size={20} />],
  ['/more', <MenuIcon size={20} />],
]

function iconFor(pathname: string): ReactElement {
  const hit = ICONS.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))
  return hit ? hit[1] : <GridIcon size={20} />
}

/**
 * 기본 레이아웃의 머리.
 *
 * 왼쪽에 그림표, 그 옆에 이름, 오른쪽에 그 화면이 주는 일.
 * 흐린 바 하나로 위에 떠 있다.
 */
export function Header({ title, back = false, bare = false, actions }: HeaderView) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header className="header" data-bare={bare || undefined}>
      {back ? (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft />
        </button>
      ) : (
        <span className="header__icon" aria-hidden="true">
          {iconFor(pathname)}
        </span>
      )}
      <h1 className="header__title">{title}</h1>
      {actions}
    </header>
  )
}
