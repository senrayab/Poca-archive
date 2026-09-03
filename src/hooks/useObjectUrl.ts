import { useEffect, useRef, useState } from 'react'

/**
 * Blob을 <img src>로 쓸 수 있는 URL로 바꾸고, 언마운트 시 확실히 해제한다.
 *
 * key를 주면 Blob 인스턴스가 바뀌어도 URL을 다시 만들지 않는다.
 * Dexie 라이브 쿼리는 테이블에 쓰기가 있을 때마다 행을 통째로 다시
 * 역직렬화하는데, 같은 사진이라도 Blob 객체는 매번 새로 만들어진다.
 * 그대로 두면 하트 하나만 눌러도 화면 안 썸네일이 전부 새 URL을 받고,
 * src가 바뀌었으니 브라우저가 전부 다시 디코드한다 — 목록이 길수록
 * 그 한 번의 탭이 눈에 띄게 굼떠진다. 그래서 카드 id처럼 사진이
 * 실제로 바뀔 때만 달라지는 값을 기준으로 삼는다.
 *
 * 다만 key만 보면 위험하다. 별도 쿼리로 읽어오는 Blob은 key보다 늦게
 * 도착할 수 있는데, 그 사이 렌더에서 '새 key + 옛 Blob'으로 URL을 만들면
 * 뒤늦게 온 진짜 Blob은 key가 그대로라 영영 반영되지 않는다.
 * 그래서 바이트 수를 함께 본다 — 같은 사진이면 늘 같으니 URL은 그대로고,
 * 다른 사진이 들어오면 key가 같아도 다시 만든다.
 */
export function useObjectUrl(
  blob: Blob | null | undefined,
  key?: string,
): string | undefined {
  const [url, setUrl] = useState<string>()

  // 효과는 key로만 다시 돌지만, 돌 때는 항상 최신 Blob을 써야 한다
  const latest = useRef(blob)
  latest.current = blob

  // key가 없으면 예전처럼 Blob 자체를 기준으로 삼는다
  const dep: unknown = blob ? (key === undefined ? blob : `${key}:${blob.size}`) : undefined

  useEffect(() => {
    const current = latest.current
    if (!current) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(current)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [dep])

  return url
}
