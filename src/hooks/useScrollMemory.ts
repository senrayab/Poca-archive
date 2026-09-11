import { useEffect, useLayoutEffect, useRef } from 'react'

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
 */
const spots = new Map<string, number>()

/**
 * @param key 화면을 가리키는 이름. 보관함·좋아요·휴지통이 각자 제 자리를 갖는다.
 * @param ready 목록이 그려졌는지. 아직 비어 있을 때 옮기면 갈 곳이 없어 0에 멈춘다.
 */
export function useScrollMemory(key: string, ready: boolean) {
  useEffect(() => {
    const remember = () => spots.set(key, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      // 떠나는 순간의 자리가 가장 정확하다 — 마지막 scroll 이후에도 움직였을 수 있다
      remember()
      window.removeEventListener('scroll', remember)
    }
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
    const y = spots.get(key)
    if (y) window.scrollTo(0, y)
  }, [key, ready])
}
