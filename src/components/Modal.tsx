import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  onClose: () => void
  children: ReactNode
  /** 상세 팝업처럼 패널 스타일을 직접 그릴 때는 false */
  panel?: boolean
  /**
   * 바깥 딤을 눌러 닫을 수 있는지.
   *
   * 뭔가 고치는 중이라면 끄는 게 낫다. 딤은 넓어서 스치듯 눌리기 쉬운데,
   * 그 한 번에 고치던 것이 걸린 물음으로 이어지면 성가시다. 나갈 길은
   * 취소·저장 단추가 이미 분명하게 내주고 있다.
   */
  closeOnScrim?: boolean
  label?: string
}

/*
 * 뒤쪽 목록 스크롤 잠금.
 *
 * 예전에는 body를 position: fixed로 띄우고 top을 현재 위치만큼 끌어올려
 * 붙잡아뒀다. 문서에 overflow: hidden을 주면 스크롤 가능 범위가 0이 되면서
 * 브라우저가 화면을 맨 위로 튕겨 올리기 때문이었다.
 *
 * 스크롤이 문서에서 안쪽 상자(.shell)로 옮겨온 뒤로는 그럴 일이 없다.
 * 안쪽 상자는 멈춰도 있던 자리를 그대로 기억하므로 표시 하나만 세우면
 * 되고, 멈추는 규칙은 CSS(body[data-locked] .shell)가 갖고 있다.
 *
 * 팝업 위에 팝업이 뜨는 경우(상세 → 삭제 확인)가 있어 잠금은 세어서 관리한다.
 */
let lockCount = 0

function lockScroll() {
  if (lockCount++ > 0) return
  document.body.dataset.locked = ''
}

function unlockScroll() {
  if (--lockCount > 0) return
  delete document.body.dataset.locked
}

/** 스크림 클릭·ESC로 닫히는 레이어 팝업의 공통 껍데기. */
export function Modal({
  onClose,
  children,
  panel = true,
  closeOnScrim = true,
  label,
}: ModalProps) {
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
        if (closeOnScrim && e.target === e.currentTarget) onClose()
      }}
    >
      {panel ? <div className="modal__panel">{children}</div> : children}
    </div>,
    document.body,
  )
}
