import { useLocation } from 'react-router-dom'

/**
 * 아래 길찾기에서 '지금 여기'를 가리는 일.
 *
 * NavLink는 주소가 정확히 맞을 때만 켜진다. 그런데 길찾기의 네 자리는
 * 화면 하나씩이 아니라 갈래 하나씩이다 — 더보기를 눌러 설정으로 들어가도
 * 여전히 더보기 안이고, 보관함에서 휴지통으로 가도 여전히 보관함 안이다.
 * 들어갈수록 표시가 꺼지면 어디에 있는지 알 수 없다.
 *
 * 그래서 갈래를 여기 한 곳에 적어두고 여섯 스킨이 같이 쓴다. 화면을 새로
 * 만들 때 어느 갈래에 속하는지만 여기 적으면 여섯이 함께 따라온다.
 */

/** 더보기에서 갈 수 있는 곳들 */
const MORE = ['/more', '/members', '/history', '/stats', '/settings', '/manage']
/** 보관함의 갈래. 휴지통도 보관함 안이다. */
const ARCHIVE = ['/', '/trash']

const under = (pathname: string, paths: string[]) =>
  paths.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)))

export function useHere() {
  const { pathname } = useLocation()
  return {
    archive: under(pathname, ARCHIVE),
    favorites: pathname === '/favorites',
    search: pathname === '/search',
    upload: pathname === '/upload',
    more: under(pathname, MORE),
  }
}

/** 켜져 있으면 'active'를 붙인다 — 스킨들이 이미 그 이름으로 그리고 있다. */
export const cls = (base: string, on: boolean) => (on ? `${base} active` : base)
