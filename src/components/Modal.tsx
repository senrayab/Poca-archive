import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** 상세 팝업처럼 패널 스타일을 직접 그릴 때는 false */
  panel?: boolean
  label?: string
}

/*
 * 뒤쪽 목록 스크롤 잠금.
 *
 * body에 overflow: hidden만 주면 문서의 스크롤 가능 범위가 0이 되면서
 * 브라우저가 스크롤 위치를 맨 위로 끌어올린다. 그래서 body를 position: fixed로
 * 띄우고 top을 현재 위치만큼 올려, 보이던 화면을 그대로 붙잡아둔다.
 *
 * 팝업 위에 팝업이 뜨는 경우(상세 → 삭제 확인)가 있어 잠금은 세어서 관리한다.
 */
let lockCount = 0
let savedY = 0
let savedStyle = { position: '', top: '', left: '', right: '' }

function lockScroll() {
  if (lockCount++ > 0) return
  savedY = window.scrollY
  const style = document.body.style
  savedStyle = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
  }
  style.position = 'fixed'
  style.top = `-${savedY}px`
  style.left = '0'
  style.right = '0'
}

function unlockScroll() {
  if (--lockCount > 0) return
  const style = document.body.style
  style.position = savedStyle.position
  style.top = savedStyle.top
  style.left = savedStyle.left
  style.right = savedStyle.right
  window.scrollTo(0, savedY)
}

/** 스크림 클릭·ESC로 닫히는 레이어 팝업의 공통 껍데기. */
export function Modal({ onClose, children, panel = true, label }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    lockScroll()
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockScroll()
    }
  }, [onClose])

  return createPortal(
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {panel ? <div className="modal__panel">{children}</div> : children}
    </div>,
    document.body,
  )
}
