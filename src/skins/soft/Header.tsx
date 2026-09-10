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
 *
 * 서랍을 여는 단추도, 뒤로 가는 단추도 두지 않는다.
 *
 * 이 스킨은 모든 화면이 아래 탭바에서 한 번에 닿는다. 등록 화면조차
 * 가운데 단추와 더보기 양쪽에서 열리므로, 왔던 길을 되짚어야만 나갈 수
 * 있는 화면이 없다. 나갈 길이 늘 밖에 나와 있는데 화면마다 또 하나씩
 * 두면 위층이 그 단추로만 채워진다.
 *
 * 예외는 자세히보기 하나다. 그쪽은 탭바를 걷으므로 제 화살표를 갖는다.
 */
export function Header({ title, actions }: HeaderView) {
  return (
    <header className="softhead">
      {actions && (
        <div className="softhead__row">
          <div className="softhead__actions">{actions}</div>
        </div>
      )}
      <h1 className="softhead__title">{title}</h1>
    </header>
  )
}
