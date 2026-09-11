import { memo } from 'react'
import {
  CheckIcon,
  CloseIcon,
  HeartIcon,
  PlusIcon,
  RestoreIcon,
  TrashIcon,
} from '@/components/Icons'
import type { Card } from '@/db/types'
import { useMembers } from '@/hooks/useData'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSweepSelect } from '@/hooks/useSweepSelect'
import type { ArchiveView, GridView } from '../types'

/**
 * 여백의 보관함 — 흰 벽에 걸린 것들.
 *
 * 다섯 스킨이 무엇을 더할지로 갈렸다면 여기는 무엇을 뺄지로 간다. 선도
 * 그림자도 판때기도 없다. 층을 가르는 것은 여백뿐이고, 검은 것은 화면에
 * 둘뿐이다 — 지금 있는 자리, 그리고 더하는 단추.
 *
 * 가운데 정렬이 요점이다. 다섯 모두 왼쪽으로 붙이는데, 가운데 정렬은
 * 도록이나 전시 캡션의 결이다. 읽는 속도가 느려지는 대신 한 줄 한 줄이
 * 또박또박 놓인다 — 이 스킨은 빨리 훑는 자리가 아니다.
 */
export function Archive(view: ArchiveView) {
  const members = useMembers()
  const {
    mode,
    title,
    loading,
    cards,
    empty,
    selected,
    selectMode,
    onOpen,
    onToggleSelect,
    onSweep,
    onSelectAll,
    onClearSelection,
    memberId,
    onSelectMember,
    onAddMember,
    onTrash,
    onRestore,
    onPurge,
    onEmptyTrash,
  } = view

  return (
    <div className="content blnk">
      <header className="blnkhead">
        <h1 className="blnkhead__title">{selectMode ? '고르는 중' : title}</h1>

        {/*
          장수는 제목 아래 한 줄로만 둔다. 이 스킨에서는 숫자도 크게 세우지
          않는다 — 크게 세우는 일은 아틀리에가 맡았고, 여기는 빼는 쪽이다.
        */}
        <p className="blnkhead__count">
          {loading ? ' ' : selectMode ? `${selected.size}장 골랐어요` : `${cards.length}장`}
        </p>

        {(selectMode || (mode === 'trash' && cards.length > 0)) && (
          <div className="blnkhead__actions" data-picking={selectMode || undefined}>
            {selectMode ? (
              <>
                {mode === 'trash' ? (
                  <>
                    <button className="blnkbtn" onClick={onRestore}>
                      <RestoreIcon size={14} />
                      되돌리기
                    </button>
                    <button className="blnkbtn blnkbtn--on" onClick={onPurge}>
                      <TrashIcon size={14} />
                      완전 삭제
                    </button>
                  </>
                ) : (
                  <button className="blnkbtn blnkbtn--on" onClick={onTrash}>
                    <TrashIcon size={14} />
                    버리기
                  </button>
                )}
                <button className="blnkbtn" onClick={onClearSelection}>
                  <CloseIcon size={14} />
                  그만
                </button>
              </>
            ) : (
              <>
                {mode === 'trash' && cards.length > 0 && (
                  <button className="blnkbtn" onClick={onEmptyTrash}>
                    <TrashIcon size={14} />
                    비우기
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </header>

      {/*
        멤버도 가운데에 아주 작게. 지금 고른 것만 검게 서고 나머지는
        종이빛에 가깝게 물러난다.
      */}
      <div className="blnkmembers" role="tablist" aria-label="멤버">
        <button
          className="blnkname"
          role="tab"
          aria-selected={memberId === null}
          onClick={() => onSelectMember(null)}
        >
          전체
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            className="blnkname"
            role="tab"
            aria-selected={memberId === m.id}
            onClick={() => onSelectMember(memberId === m.id ? null : m.id)}
          >
            {m.name}
          </button>
        ))}
        <button className="blnkname blnkname--add" onClick={onAddMember} aria-label="멤버 추가">
          <PlusIcon size={13} />
        </button>
      </div>

      {loading ? null : cards.length === 0 ? (
        empty
      ) : (
        <>
          {!selectMode && (
            <p className="blnkhint">
              길게 누르면 여러 장을 고를 수 있어요
              <button onClick={onSelectAll}>전체 선택</button>
            </p>
          )}

          <Grid
            cards={cards}
            showFav={mode !== 'favorites'}
            selectMode={selectMode}
            selected={selected}
            onOpen={onOpen}
            onToggleSelect={onToggleSelect}
            onSweep={onSweep}
          />
        </>
      )}
    </div>
  )
}

/**
 * 카드가 깔리는 격자.
 *
 * 보관함에서 떼어 따로 둔다. 검색처럼 '카드를 늘어놓는' 다른 화면도 같은
 * 격자를 써야 스킨이 화면마다 달라 보이지 않는다. 꾹 눌러 쓸어 고르는
 * 손짓도 격자가 갖는 것이 맞다 — 고르는 것은 카드이지 화면이 아니다.
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
  const sweep = useSweepSelect({ cards, selectedIds: selected, onSweep })

  return (
    <div
              className="blnkgrid"
              ref={sweep.ref}
              data-dragging={sweep.dragging || undefined}
              {...sweep.handlers}
            >
              {cards.map((card) => (
                <Piece
                  key={card.id}
                  card={card}
                  showFav={showFav}
                  selectable={selectMode}
                  selected={selected.has(card.id)}
                  onOpen={onOpen}
                  onToggleSelect={onToggleSelect}
                  handledByPress={sweep.handledByPress}
                />
              ))}
            </div>
  )
}

const Piece = memo(function Piece({
  card,
  showFav,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
  handledByPress,
}: {
  card: Card
  showFav: boolean
  selectable: boolean
  selected: boolean
  onOpen: (card: Card) => void
  onToggleSelect: (card: Card) => void
  /** 길게 눌러 이미 골라졌다면 여기서 또 뒤집지 않는다 */
  handledByPress: () => boolean
}) {
  const url = useObjectUrl(card.thumb, card.id)

  return (
    <button
      className="blnkpiece"
      data-card-id={card.id}
      data-selected={selected}
      onClick={() => (selectable ? onToggleSelect(card) : onOpen(card))}
      onContextMenu={(e) => {
        // 길게 누르면 폰이 사진 저장 메뉴를 띄우므로 어느 경우든 막는다
        e.preventDefault()
        if (handledByPress()) return
        onToggleSelect(card)
      }}
      aria-label={card.title || card.memo || '포토카드'}
    >
      {url && <img src={url} alt="" loading="lazy" decoding="async" />}
      {selectable && (
        <span className="blnkpiece__check" data-on={selected}>
          {selected && <CheckIcon size={11} />}
        </span>
      )}
      {card.favorite === 1 && showFav && !selectable && (
        <span className="blnkpiece__fav">
          <HeartIcon size={12} filled />
        </span>
      )}
    </button>
  )
})
