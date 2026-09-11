import type { HeaderView } from '../types'

/**
 * 여백의 머리 — 보관함 밖의 화면들이 쓴다.
 *
 * 가운데 정렬이다. 다섯 스킨이 모두 왼쪽으로 붙이는데, 가운데 정렬은
 * 도록이나 전시 캡션의 결이다. 읽는 속도가 느려지는 대신 한 줄 한 줄이
 * 또박또박 놓인다 — 이 스킨은 빨리 훑는 자리가 아니다.
 *
 * 층을 가르는 것은 아무것도 없다. 선도 그림자도 판때기도 없이 여백만으로
 * 나눈다.
 */
export function Header({ title, actions }: HeaderView) {
  return (
    <header className="blnkhead">
      <h1 className="blnkhead__title">{title}</h1>
      {actions && <div className="blnkhead__actions">{actions}</div>}
    </header>
  )
}
