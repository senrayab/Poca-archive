import type { HeaderView } from '../types'

/**
 * 녹턴의 머리 — 보관함 밖의 화면들이 쓴다.
 *
 * 바가 아니라 알약 하나다. 화면을 가로지르는 줄을 두면 그 아래가 '내용
 * 칸'으로 갈리는데, 이 스킨은 어두운 한 장을 그대로 두고 그 위에 뜬
 * 것들만 얹는 결이다. 이름도 그렇게 떠 있는 것 중 하나로 둔다.
 *
 * 돌아가는 단추는 두지 않는다. 오른쪽 기둥이 어느 화면에서도 떠 있어
 * 되짚을 일이 없다.
 */
export function Header({ title, actions }: HeaderView) {
  return (
    <header className="nocthead">
      <span className="noctpill nocthead__name">{title}</span>
      {actions && <div className="nocthead__actions">{actions}</div>}
    </header>
  )
}
