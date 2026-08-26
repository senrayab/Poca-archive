import { useEffect, useState } from 'react'

/** Blob을 <img src>로 쓸 수 있는 URL로 바꾸고, 언마운트 시 확실히 해제한다. */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}
