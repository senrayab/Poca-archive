import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { Member } from '@/db/types'
import { useLayout } from '@/skins'
import type { HeaderView } from '@/skins/types'
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

export function AppShell() {
  const { pathname } = useLocation()
  const { Nav } = useLayout()
  const onCard = pathname.startsWith('/card/')
  const [editorMember, setEditorMember] = useState<Member | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const openMemberEditor = useCallback((member?: Member) => {
    setEditorMember(member ?? null)
    setEditorOpen(true)
  }, [])

  const api = useMemo<ShellApi>(() => ({ openMemberEditor }), [openMemberEditor])

  return (
    <ShellContext.Provider value={api}>
      <div className="shell">
        <Outlet />
      </div>

      {/*
        자세히보기 페이지에서는 길찾기를 걷는다. 한 장을 크게 보는 자리라
        아래에 바가 걸치면 사진이 그만큼 눌리고, 나가는 길은 왼쪽 위
        닫기가 이미 내주고 있다.
      */}
      {onCard ? null : <Nav />}

      {editorOpen && (
        <MemberEditor
          member={editorMember ?? undefined}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </ShellContext.Provider>
  )
}
