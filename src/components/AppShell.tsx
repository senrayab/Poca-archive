import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
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

export function AppShell() {
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
      <Fab onAddMember={() => openMemberEditor()} />

      {editorOpen && (
        <MemberEditor
          member={editorMember ?? undefined}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </ShellContext.Provider>
  )
}
