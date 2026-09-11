import { createContext, useContext } from 'react'
import type { Member } from '@/db/types'

/**
 * 멤버 편집기를 여는 손잡이.
 *
 * AppShell에서 따로 뗀 건 고리를 끊기 위해서다 — 스킨의 보관함은 이 손잡이가
 * 필요하고, AppShell은 스킨을 불러온다. 둘이 서로를 부르면 먼저 읽히는 쪽이
 * 아직 덜 만들어진 채로 상대를 보게 된다. 손잡이만 여기 두면 어느 쪽도
 * 상대를 먼저 읽을 필요가 없다.
 */
export interface ShellApi {
  openMemberEditor: (member?: Member) => void
}

export const ShellContext = createContext<ShellApi>({
  openMemberEditor: () => {},
})

export const useShell = () => useContext(ShellContext)
