import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'poca:name'

export const DEFAULT_APP_NAME = '포토카드 아카이브'

/** 입력창을 방해하지 않도록 저장은 입력한 그대로 하고, 표시할 때만 다듬는다. */
function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // 시크릿 모드 등에서 localStorage 접근이 막힐 수 있다.
    return ''
  }
}

let raw = read()
const listeners = new Set<() => void>()

const display = (value: string) => value.trim() || DEFAULT_APP_NAME

function apply() {
  document.title = display(raw)
}

export function setAppName(next: string) {
  raw = next
  try {
    if (next.trim()) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용된다 */
  }
  apply()
  listeners.forEach((listener) => listener())
}

export function initAppName() {
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function useRawAppName(): string {
  return useSyncExternalStore(
    subscribe,
    () => raw,
    () => '',
  )
}

/** 입력창용 — 사용자가 친 그대로. 비어 있으면 빈 문자열이다. */
export function useAppNameInput(): string {
  return useRawAppName()
}

/** 화면 표시용 — 비어 있으면 기본 이름으로 떨어진다. */
export function useAppName(): string {
  return display(useRawAppName())
}
