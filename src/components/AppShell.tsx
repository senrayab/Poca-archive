import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { Member } from '@/db/types'
import { Drawer } from './Drawer'
import { Fab } from './Fab'
import { ChevronLeft, MenuIcon } from './Icons'
import { MemberEditor } from './MemberEditor'

interface ShellApi {
  openDrawer: () => void
  openMemberEditor: (member?: Member) => void
}

const ShellContext = createContext<ShellApi>({
  openDrawer: () => {},
  openMemberEditor: () => {},
})

export const useShell = () => useContext(ShellContext)

interface HeaderProps {
  title: string
  /** 보관함 밖의 화면은 뒤로가기 버튼을 쓴다 */
  back?: boolean
  actions?: ReactNode
}

export function Header({ title, back = false, actions }: HeaderProps) {
  const { openDrawer } = useShell()
  const navigate = useNavigate()

  return (
    <header className="header">
      {back ? (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft />
        </button>
      ) : (
        <button className="icon-btn" onClick={openDrawer} aria-label="메뉴 열기">
          <MenuIcon />
        </button>
      )}
      <h1 className="header__title">{title}</h1>
      {actions}
    </header>
  )
}

/**
 * 등록 FAB를 띄울 화면. 관리 계열(등록/멤버/통계/설정)에는 띄우지 않는다.
 * 허용 목록으로 둬서 화면을 새로 추가해도 FAB가 딸려 나오지 않게 한다.
 */
const FAB_ROUTES = new Set(['/', '/favorites', '/trash'])

export function AppShell() {
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editorMember, setEditorMember] = useState<Member | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const openMemberEditor = useCallback((member?: Member) => {
    setEditorMember(member ?? null)
    setEditorOpen(true)
  }, [])

  const api = useMemo<ShellApi>(
    () => ({ openDrawer: () => setDrawerOpen(true), openMemberEditor }),
    [openMemberEditor],
  )

  return (
    <ShellContext.Provider value={api}>
      <div className="shell">
        <Outlet />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {FAB_ROUTES.has(pathname) && <Fab onAddMember={() => openMemberEditor()} />}

      {editorOpen && (
        <MemberEditor
          member={editorMember ?? undefined}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </ShellContext.Provider>
  )
}
