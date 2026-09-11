import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 보던 자리를 기억한다.
 *
 * 자세히보기를 페이지로 열면 목록은 화면에서 내려가고, 뒤로 돌아올 때 다시
 * 처음부터 그려진다. 한참 내려가서 고른 카드일수록 돌아온 자리가 멀다 —
 * 보던 데로 다시 내려가는 일이 카드를 여는 일보다 오래 걸린다.
 *
 * 브라우저도 뒤로가기에서 자리를 되살리려 하지만, 그건 그 자리에 이미
 * 내용이 있을 때의 이야기다. 여기서는 돌아온 뒤에야 카드가 그려지므로
 * 되살릴 때는 문서가 아직 한 화면 높이밖에 되지 않는다.
 *
 * 그래서 직접 적어둔다. 적는 곳은 이 파일 안의 표다 — 앱이 살아 있는 동안만
 * 남으면 되고, 저장소에 넣으면 어제 보던 자리로 돌아가 버린다.
 *
 * 표의 칸은 화면이 아니라 방문 기록 한 칸마다 따로 둔다. 뒤로 와서 닿는
 * 기록은 떠날 때의 그 칸이지만, 아래 바를 눌러 새로 들어가면 새 칸이 생긴다.
 * 그래서 되돌아올 때만 보던 자리로 가고, 새로 들어올 때는 맨 위에서
 * 시작한다 — 브라우저가 페이지를 오갈 때 하는 것과 같다.
 */
const spots = new Map<string, number>()

/**
 * @param name 화면을 가리키는 이름. 보관함·좋아요·휴지통이 각자 제 자리를 갖는다.
 * @param ready 목록이 그려졌는지. 아직 비어 있을 때 옮기면 갈 곳이 없어 0에 멈춘다.
 */
export function useScrollMemory(name: string, ready: boolean) {
  const key = `${name}@${useLocation().key}`

  /*
   * 되살릴 자리는 들어온 순간에 집어 둔다.
   *
   * 목록이 그려지기를 기다리는 동안에도 scroll은 일어난다 — 문서가 짧으니
   * 브라우저가 자리를 끌어올리면서다. 그 값이 표에 적히고 나서 표를 읽으면
   * 되살릴 자리가 이미 0으로 바뀌어 있다.
   */
  const saved = useRef(spots.get(key))

  /*
   * 적는 일은 scroll이 날 때만 한다. 떠나는 순간에 한 번 더 적지 않는다.
   *
   * 한때는 떠날 때 마지막으로 적었는데, 그 순간이면 이미 늦다. 자세히보기가
   * 들어오며 목록이 걷히면 문서가 한 화면으로 줄고 브라우저가 자리를 0으로
   * 끌어올린다. 그 뒤에 적으면 보던 자리 대신 0이 남는다 — 돌아오면 늘 맨
   * 위였던 까닭이 이것이다.
   *
   * 그래서 귀를 떼는 일도 목록이 걷히기 전에 한다(useLayoutEffect). 그냥
   * useEffect였다면 목록이 걷힌 뒤에 떼어, 끌어올리며 난 scroll까지 듣는다.
   */
  useLayoutEffect(() => {
    const remember = () => spots.set(key, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [key])

  /*
   * 되돌리는 일은 한 번뿐이다. 되돌린 뒤에는 손이 굴리는 대로 두어야 하는데,
   * 여기서 계속 붙잡으면 목록이 바뀔 때마다 화면이 제자리로 튄다.
   *
   * 그리기 전에 옮긴다(useLayoutEffect). 그려진 다음에 옮기면 맨 위가 한 번
   * 비쳤다가 내려가는 것이 눈에 보인다.
   */
  const done = useRef(false)
  useLayoutEffect(() => {
    if (done.current || !ready) return
    done.current = true
    const y = saved.current
    if (y) window.scrollTo(0, y)
  }, [key, ready])
}
