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
  /*
   * 뒤로가기는 '흐름을 빠져나오는' 화면(등록)만 쓴다.
   * 서랍에서 바로 여는 관리 화면은 온 길이 하나가 아니라서, 뒤로가기보다
   * 서랍을 다시 여는 편이 자연스럽다.
   */
  back?: boolean
  /*
   * 아래에 붙는 층(멤버·분류 탭)이 헤더 자리까지 덮는 배경을 직접 그릴 때 켠다.
   * backdrop-filter는 요소마다 따로 계산돼서, 헤더와 탭이 각자 흐림을 걸면
   * 맞닿는 자리에 경계가 생긴다. 그래서 한쪽이 배경을 통째로 맡는다.
   */
  bare?: boolean
  actions?: ReactNode
}

export function Header({ title, back = false, bare = false, actions }: HeaderProps) {
  const { openDrawer } = useShell()
  const navigate = useNavigate()

  return (
    <header className="header" data-bare={bare || undefined}>
      {back && (
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeft />
        </button>
      )}
      <h1 className="header__title">{title}</h1>
      {actions}
      {/*
        메뉴는 헤더 맨 오른쪽 끝에 둔다. 폰을 한 손으로 쥐면 왼쪽 위가
        엄지에서 제일 먼 구석이라, 매일 여는 버튼을 거기 두면 안 된다.
        가장자리 스와이프는 답이 못 된다 — 좌우 끝은 OS 뒤로가기 제스처가
        먼저 가져간다.
      */}
      <button className="icon-btn" onClick={openDrawer} aria-label="메뉴 열기">
        <MenuIcon />
      </button>
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
