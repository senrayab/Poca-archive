import type { HeaderView } from '../types'

/**
 * 프리즘의 머리 — 보관함 밖의 화면들이 쓴다.
 *
 * 바를 두지 않는다. 이 스킨은 화면 전체가 한 장의 유리판이고 그 위에 뜬
 * 것들만 얹히는 결이라, 가로지르는 줄을 넣으면 판이 둘로 잘린다.
 * 이름은 크고 굵게 제 줄을 갖는다.
 *
 * 돌아가는 단추도 없다. 아래 캡슐이 어느 화면에서도 떠 있다.
 */
export function Header({ title, actions }: HeaderView) {
  return (
    <header className="przhead">
      {actions && <div className="przhead__actions">{actions}</div>}
      <h1 className="przhead__title">{title}</h1>
    </header>
  )
}
