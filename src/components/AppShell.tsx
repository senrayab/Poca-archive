import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { Member } from '@/db/types'
import { useLayout } from '@/skins'
import type { HeaderView } from '@/skins/types'
import { Drawer } from './Drawer'
import { Fab } from './Fab'
import { MemberEditor } from './MemberEditor'
import { ShellContext, type ShellApi } from './shell'

export { useShell } from './shell'

/**
 * 머리는 스킨이 그린다.
 *
 * 화면들은 예전처럼 Header 하나만 부르면 되고, 그것이 지금 스킨의 머리로
 * 이어진다. 큰 제목 덩어리로 갈지 흐린 바로 갈지는 스킨이 정할 일이지,
 * 화면이 알 일이 아니다.
 */
export function Header(view: HeaderView) {
  const { Header: Painted } = useLayout()
  return <Painted {...view} />
}

/**
 * 등록 FAB를 띄울 화면. 관리 계열(등록/멤버/통계/설정)에는 띄우지 않는다.
 * 허용 목록으로 둬서 화면을 새로 추가해도 FAB가 딸려 나오지 않게 한다.
 */
const FAB_ROUTES = new Set(['/', '/favorites', '/trash'])

export function AppShell() {
  const { pathname } = useLocation()
  const { Nav } = useLayout()
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
      {/*
        길찾기는 스킨이 제 것을 갖고 있으면 그것을 쓴다. 없을 때만 기본
        차림인 FAB를 띄운다 — 아래 탭바 안에 등록 단추가 있는데 오른쪽
        아래에도 하나 더 뜨면 어느 쪽이 진짜인지 알 수 없다.
      */}
      {Nav ? <Nav /> : FAB_ROUTES.has(pathname) && <Fab onAddMember={() => openMemberEditor()} />}

      {editorOpen && (
        <MemberEditor
          member={editorMember ?? undefined}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </ShellContext.Provider>
  )
}
