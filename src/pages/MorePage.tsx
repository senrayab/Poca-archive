import { Link } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Header } from '@/components/AppShell'
import {
  BackupIcon,
  ChartIcon,
  ChevronRight,
  GridIcon,
  HeartIcon,
  HistoryIcon,
  SettingsIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
} from '@/components/Icons'
import { useCountsByMember, useTrashCount } from '@/hooks/useData'
import { useAppName } from '@/lib/appName'
import { SHOW_CATEGORY } from '@/lib/features'

/**
 * 갈 곳을 한 화면에 펼쳐놓은 페이지.
 *
 * 서랍은 옆에서 밀려나와 화면을 덮는다. 갈 곳이 많고 어느 화면에서든
 * 같은 손짓으로 열려야 할 때는 그게 맞다. 그런데 아래 탭바를 둔 뒤로는
 * 자주 가는 곳이 이미 밖에 나와 있어, 서랍이 맡는 것은 '가끔 가는 나머지'
 * 뿐이다. 그 나머지를 보자고 화면을 덮을 이유가 없다.
 *
 * 페이지로 두면 주소가 생겨 뒤로가기가 저절로 맞고, 탭바에서 지금 여기가
 * 어디인지도 그대로 보인다 — 덮여 있는 동안에는 그 표시가 가려진다.
 *
 * 파스텔까지 아래로 내려온 뒤로 서랍은 쓰는 곳이 없어 걷었다. 서랍 맨 위에
 * 있던 이름표는 갈 곳이 없어지므로 이 화면 머리로 옮겨 왔다.
 */
export function MorePage() {
  const { total } = useCountsByMember()
  const trash = useTrashCount()
  const appName = useAppName()

  const row = (to: string, icon: ReactElement, label: string, badge?: number) => (
    <Link className="more__row" to={to}>
      <span className="more__icon">{icon}</span>
      <span className="more__label">{label}</span>
      {badge !== undefined && <span className="more__count">{badge}</span>}
      <ChevronRight size={18} />
    </Link>
  )

  return (
    <>
      <Header title="더보기" />

      <div className="content">
        <div className="more">
          <div className="more__brand">
            {/* 앞은 가볍게, 뒤는 최대한 굵게 — 두 무게 차이가 이름의 생김새다 */}
            <strong className="brand">
              <span className="brand__thin">varies</span> <span className="brand__bold">gem.</span>
            </strong>
            <span>{appName}</span>
          </div>

          <p className="more__group">보관함</p>
          <div className="more__panel">
            {row('/', <GridIcon size={19} />, '전체 포토카드', total)}
            {row('/favorites', <HeartIcon size={19} />, '좋아요')}
            {row('/trash', <TrashIcon size={19} />, '휴지통', trash)}
          </div>

          <p className="more__group">관리</p>
          <div className="more__panel">
            {row('/upload', <UploadIcon size={19} />, '포토카드 등록')}
            {row(
              '/members',
              <UsersIcon size={19} />,
              SHOW_CATEGORY ? '멤버 · 카테고리 관리' : '멤버 관리',
            )}
            {row('/history', <HistoryIcon size={19} />, '양도 · 판매 내역')}
            {row('/stats', <ChartIcon size={19} />, '통계')}
            {row('/settings', <SettingsIcon size={19} />, '설정')}
            {row('/manage', <BackupIcon size={19} />, '백업 · 관리')}
          </div>
        </div>
      </div>
    </>
  )
}
