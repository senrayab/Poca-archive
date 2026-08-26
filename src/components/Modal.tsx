import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** 상세 팝업처럼 패널 스타일을 직접 그릴 때는 false */
  panel?: boolean
  label?: string
}

/** 스크림 클릭·ESC로 닫히는 레이어 팝업의 공통 껍데기. */
export function Modal({ onClose, children, panel = true, label }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // 팝업이 떠 있는 동안 뒤쪽 목록이 스크롤되지 않게 잠근다.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
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
