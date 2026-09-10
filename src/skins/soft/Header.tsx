import { useNavigate } from 'react-router-dom'
import { useShell } from '@/components/shell'
import { ChevronLeft, MenuIcon } from '@/components/Icons'
import type { HeaderView } from '../types'

/**
 * 소프트의 머리 — 보관함 밖의 화면들이 쓴다.
 *
 * 기본 차림은 단추와 이름이 한 줄에 나란히 서서, 이름이 단추 사이에 낀다.
 * 여기서는 두 층으로 나눈다. 위층에 흰 알약 단추만 두고, 아래층에 이름을
 * 크고 굵게 혼자 세운다 — 참고한 그림들이 하나같이 그렇게 한다.
 *
 * 이름이 제 줄을 가지면 길어져도 줄바꿈이 나지 않고, 무엇보다 화면에
 * 들어섰을 때 여기가 어디인지가 가장 먼저 읽힌다.
 */
export function Header({ title, back = false, actions }: HeaderView) {
  const { openDrawer } = useShell()
  const navigate = useNavigate()

  return (
    <header className="softhead">
      <div className="softhead__row">
        {back ? (
          <button className="softbtn" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} />
            뒤로
          </button>
        ) : (
          <button className="softbtn softbtn--round" onClick={openDrawer} aria-label="메뉴 열기">
            <MenuIcon size={19} />
          </button>
        )}
        <div className="softhead__actions">{actions}</div>
      </div>
      <h1 className="softhead__title">{title}</h1>
    </header>
  )
}
