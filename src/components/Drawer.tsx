import { useEffect, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { useAppName } from '@/lib/appName'
import { NavLink } from 'react-router-dom'
import { useCountsByMember, useTrashCount } from '@/hooks/useData'
import {
  ChartIcon,
  CloseIcon,
  GridIcon,
  SettingsIcon,
  TagIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
} from './Icons'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

export function Drawer({ open, onClose }: DrawerProps) {
  const appName = useAppName()
  const { total } = useCountsByMember()
  const trash = useTrashCount()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const item = (
    to: string,
    icon: ReactElement,
    label: string,
    badge?: string | number,
  ) => (
    <NavLink to={to} end className="drawer__item" onClick={onClose}>
      {icon}
      <span>{label}</span>
      {badge !== undefined && <span className="badge">{badge}</span>}
    </NavLink>
  )

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <nav className="drawer" aria-label="주 메뉴">
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div className="drawer__brand" style={{ flex: 1 }}>
            <strong>POCA</strong>
            <span>{appName}</span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="메뉴 닫기">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="drawer__section">보관함</div>
        {item('/', <GridIcon size={20} />, '전체 포토카드', total)}
        {item('/favorites', <TagIcon size={20} />, '즐겨찾기')}
        {item('/trash', <TrashIcon size={20} />, '휴지통', trash)}

        <div className="drawer__section">관리</div>
        {item('/upload', <UploadIcon size={20} />, '포토카드 등록')}
        {item('/members', <UsersIcon size={20} />, '멤버 · 카테고리 관리')}
        {item('/stats', <ChartIcon size={20} />, '통계')}
        {item('/settings', <SettingsIcon size={20} />, '백업 · 설정')}
      </nav>
    </>,
    document.body,
  )
}
