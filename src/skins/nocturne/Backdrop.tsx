import { memo } from 'react'
import type { Card } from '@/db/types'
import { useObjectUrl } from '@/hooks/useObjectUrl'

/**
 * 화면 뒤에 깔리는 사진.
 *
 * 크게 흐려 놓고 그 위에 막을 덮는다. 흐림만으로는 밝은 사진에서 글자가
 * 묻히고, 막만으로는 무엇인지 알아볼 수 있어 눈이 그리로 간다. 둘을
 * 겹쳐야 '무슨 빛깔인지는 알겠는데 무엇인지는 아닌' 자리가 된다.
 *
 * 흐림 값이 큰 건 받는 것이 썸네일이라서다. 작은 그림을 화면 크기로
 * 늘리면 원래 거칠어지는데, 그만큼 크게 흐리면 오히려 얼룩이 고와진다.
 */
export const Backdrop = memo(function Backdrop({ card }: { card?: Card }) {
  const url = useObjectUrl(card?.thumb, card?.id)
  if (!url) return null
  return (
    <div className="noctback" aria-hidden="true">
      <img src={url} alt="" />
    </div>
  )
})
