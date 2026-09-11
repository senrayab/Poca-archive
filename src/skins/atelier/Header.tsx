import type { HeaderView } from '../types'

/**
 * 아틀리에의 머리 — 보관함 밖의 화면들이 쓴다.
 *
 * 화면 이름을 작은 라벨로 위에 얹고, 그 아래에 큰 활자를 둔다. 잡지의
 * 꼭지 이름과 제목이 놓이는 차례 그대로다.
 *
 * 층을 가르는 것은 머리카락처럼 얇은 선 하나뿐이다. 앞의 셋이 전부
 * '떠 있는 것'으로 층을 갈랐으니 여기는 반대로 간다 — 종이에는 그림자가
 * 아니라 선이 그어진다.
 */
export function Header({ title, actions }: HeaderView) {
  return (
    <header className="atlhead">
      <p className="atlhead__label">포카</p>
      <h1 className="atlhead__title">{title}</h1>
      {actions && <div className="atlhead__actions">{actions}</div>}
      <hr className="atlrule" />
    </header>
  )
}
