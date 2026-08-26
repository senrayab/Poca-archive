import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setPendingFiles } from '@/lib/pendingFiles'
import { ImageIcon, PlusIcon, UploadIcon, UsersIcon } from './Icons'

interface FabProps {
  onAddMember: () => void
}

/**
 * 화면 오른쪽 아래에 떠 있는 업로드 플로팅 메뉴.
 * 기본 동작(사진 고르기)이 한 번의 탭으로 끝나도록 주 버튼에 붙여두고,
 * 나머지는 펼쳐지는 미니 버튼으로 뺐다.
 */
export function Fab({ onAddMember }: FabProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const pickFiles = () => {
    setOpen(false)
    inputRef.current?.click()
  }

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPendingFiles(files)
    navigate('/upload')
  }

  return (
    <>
      {/* 바깥을 눌러 닫기 위한 투명 막. FAB 스택보다 아래에 깔려야 미니 버튼이 눌린다. */}
      {open && (
        <div
          className="scrim"
          style={{ background: 'transparent', zIndex: 39 }}
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fab-stack">
        <button
          className="fab"
          data-open={open}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="등록 메뉴"
        >
          <PlusIcon size={26} />
        </button>

        {open && (
          <>
            <button className="fab-mini" onClick={pickFiles}>
              <ImageIcon size={18} />
              사진 골라서 등록
            </button>
            <button
              className="fab-mini"
              onClick={() => {
                setOpen(false)
                navigate('/upload')
              }}
            >
              <UploadIcon size={18} />
              등록 화면 열기
            </button>
            <button
              className="fab-mini"
              onClick={() => {
                setOpen(false)
                onAddMember()
              }}
            >
              <UsersIcon size={18} />
              멤버 추가
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFiles}
      />
    </>
  )
}
