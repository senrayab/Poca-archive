import { CardGrid } from '@/components/CardGrid'
import type { GridView } from '../types'

/**
 * 기본 차림의 격자.
 *
 * 이 차림은 격자를 진작 따로 갖고 있었다(CardGrid). 다른 스킨들이 제
 * 격자를 보관함 안에 품고 있던 것과 달라서, 여기서는 그것을 자리에 맞게
 * 이어주기만 하면 된다.
 */
export function Grid({
  cards,
  showFav,
  selectMode,
  selected,
  onOpen,
  onToggleSelect,
  onSweep,
}: GridView) {
  return (
    <CardGrid
      cards={cards}
      showFav={showFav}
      selectable={selectMode}
      selectedIds={selected}
      onOpen={onOpen}
      onToggleSelect={onToggleSelect}
      onSweep={onSweep}
    />
  )
}
