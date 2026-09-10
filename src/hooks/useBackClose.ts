import { useEffect, useRef } from 'react'

/**
 * 폰의 뒤로가기로 레이어 팝업을 닫는다.
 *
 * 팝업은 화면을 덮고 있지만 주소가 바뀌지 않으니, 브라우저가 보기에는 아무
 * 일도 없는 상태다. 그대로 두면 뒤로가기가 팝업을 건너뛰고 앞 화면으로
 * 가거나 앱을 닫아 버린다. 사람이 보기에는 팝업이 한 페이지인데 말이다.
 *
 * 그래서 팝업이 떠 있는 동안 히스토리에 빈 칸 하나를 세워 둔다. 뒤로가기는
 * 그 칸을 먼저 걷어내고, 우리는 그 신호를 받아 팝업을 닫는다. 앞 화면은
 * 그대로 남는다.
 *
 * 칸은 팝업 수와 상관없이 늘 하나만 세운다. 팝업마다 하나씩 쌓으면, 여럿이
 * 한꺼번에 닫힐 때(저장하며 확인창과 팝업이 같이 닫히는 경우) 몇 칸을
 * 걷어내야 하는지 어긋나기 쉽다. 한 칸을 걷어낼 때 아직 남은 팝업이 있으면
 * 그 자리에서 다시 세우면 된다.
 *
 * 아무 데나 붙이면 안 된다. 닫히면서 화면을 옮기는 것에 붙이면, 옮겨간 뒤에
 * 이 훅이 세워둔 칸을 걷으며 그 이동까지 취소해 버린다. 서랍 메뉴에 붙였다가
 * 정확히 그 일이 났다 — 메뉴를 눌러 다른 화면으로 가도 곧바로 되돌아왔다.
 * 스스로 닫히기만 하는 것에만 붙인다.
 */

/** 떠 있는 팝업들. 마지막 것이 맨 위다. */
const layers: Array<() => void> = []
/** 히스토리에 우리가 세워둔 칸이 있는가 */
let guard = false

function raise() {
  // 주소는 그대로 두고 상태만 얹는다 — 라우터가 보기에 같은 화면이라 아무 일도 없다
  window.history.pushState({ ...window.history.state, __layer: true }, '')
  guard = true
}

function onPop() {
  const close = layers[layers.length - 1]
  if (!close) {
    guard = false
    return
  }
  /*
   * 방금 우리 칸이 걷혔다. 아직 다른 팝업이 남아 있으면 그 자리에서 다시
   * 세워 둔다 — 다음 뒤로가기도 받아내야 하기 때문이다. 미루지 않고 바로
   * 세우는 건, 뒤로가기를 연달아 누를 때 그 틈으로 앱이 닫히지 않게 하려는 것이다.
   */
  if (layers.length > 1) raise()
  else guard = false
  close()
}

function register(close: () => void) {
  layers.push(close)
  if (layers.length === 1) window.addEventListener('popstate', onPop)
  if (!guard) raise()

  return () => {
    const at = layers.lastIndexOf(close)
    if (at >= 0) layers.splice(at, 1)
    if (layers.length) return

    window.removeEventListener('popstate', onPop)
    // 뒤로가기가 아닌 방법으로 닫혔다면 세워둔 칸을 도로 걷는다
    if (guard) {
      guard = false
      window.history.back()
    }
  }
}

/**
 * @param active 서랍처럼 붙어 있는 채로 여닫는 것은 열려 있는 동안만 넘긴다.
 */
export function useBackClose(onClose: () => void, active = true) {
  /*
   * 닫는 함수는 렌더마다 새로 만들어지는 경우가 많다. 그걸 그대로 의존성에
   * 두면 렌더할 때마다 칸을 세웠다 걷었다 하게 되므로, 최신 것을 따로 들고
   * 붙는 일은 한 번만 한다.
   */
  const latest = useRef(onClose)
  latest.current = onClose

  useEffect(() => {
    if (!active) return
    return register(() => latest.current())
  }, [active])
}
