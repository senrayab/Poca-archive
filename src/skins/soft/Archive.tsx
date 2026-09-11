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
 * 소프트의 보관함.
 *
 * 회색 바탕 위에 흰 판이 떠 있는 결이다. 그래서 이 레이아웃은 무엇이든
 * '판 위에 얹는' 방식으로 놓는다 — 단추도 알약, 멤버도 알약, 카드도
 * 흰 액자에 끼운 사진이다.
 *
 * 격자는 세 열이다. 넉 장씩 놓던 기본 차림보다 한 장이 커져서, 사진이
 * 작은 무늬가 아니라 카드 한 장으로 보인다. 대신 액자 여백과 그림자가
 * 자리를 먹으므로 더 늘리지는 않았다.
 *
 * 위쪽은 두 층이다. 단추만 있는 줄과, 이름이 혼자 서는 줄. 그 아래에
 * 몇 장인지 한 줄로 붙는다 — 참고한 그림의 '큰 제목 + 회색 한 줄'이다.
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

  /* 좁혀 보고 있는데 비었다면, 비었다는 말과 안 맞는다는 말은 다르다 */
  const filtered = memberId !== null

  return (
    <div className="content soft">
      <header className="softhead">
        {/*
          위층은 할 일이 있을 때만 선다.
          서랍을 여는 단추는 두지 않는다 — 아래 탭바의 '더보기'가 이미 그
          일을 하므로, 위에도 두면 같은 문을 두 곳에서 여는 셈이다. 그래서
          고르는 중이거나 비울 것이 있을 때만 이 줄이 나타나고, 평소에는
          이름이 맨 위에 혼자 선다.
        */}
        {(selectMode || (mode === 'trash' && cards.length > 0)) && (
        <div className="softhead__row">
          {selectMode && (
            <button className="softbtn" onClick={onClearSelection}>
              <CloseIcon size={17} />
              그만 고르기
            </button>
          )}

          <div className="softhead__actions" data-picking={selectMode || undefined}>
            {selectMode ? (
              <>
                {mode === 'trash' ? (
                  <>
                    <button className="softbtn softbtn--round" onClick={onRestore} aria-label="되돌리기">
                      <RestoreIcon size={19} />
                    </button>
                    <button className="softbtn softbtn--dark" onClick={onPurge}>
                      <TrashIcon size={17} />
                      완전 삭제
                    </button>
                  </>
                ) : (
                  <button className="softbtn softbtn--dark" onClick={onTrash}>
                    <TrashIcon size={17} />
                    {selected.size}장 버리기
                  </button>
                )}
              </>
            ) : (
              mode === 'trash' &&
              cards.length > 0 && (
                <button className="softbtn" onClick={onEmptyTrash}>
                  <TrashIcon size={17} />
                  비우기
                </button>
              )
            )}
          </div>
        </div>
        )}

        <h1 className="softhead__title">{title}</h1>
        {!selectMode && (
          <p className="softhead__sub">
            {loading
              ? '\u00a0'
              : cards.length === 0
                ? filtered
                  ? '조건에 맞는 카드가 없어요'
                  : '아직 비어 있어요'
                : `${cards.length}장을 모았어요`}
          </p>
        )}
      </header>

      
      {/*
        멤버는 담는 레일 없이 알약 하나하나가 떠 있다. 지금 고른 것만
        검은 알약이 되어, 아래 탭바에서 지금 자리를 알리는 방식과 같은
        말을 쓴다 — 이 스킨에서 '지금 이것'은 늘 검게 채워진다.
      */}
      <div className="softmembers" role="tablist" aria-label="멤버">
        <button
          className="softchip"
          role="tab"
          aria-selected={memberId === null}
          onClick={() => onSelectMember(null)}
        >
          전체
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            className="softchip"
            role="tab"
            aria-selected={memberId === m.id}
            onClick={() => onSelectMember(memberId === m.id ? null : m.id)}
          >
            {m.name}
          </button>
        ))}
        <button className="softchip softchip--add" onClick={onAddMember} aria-label="멤버 추가">
          <PlusIcon size={16} />
        </button>
      </div>

      {loading ? null : cards.length === 0 ? (
        empty
      ) : (
        <>
          {!selectMode && (
            <div className="softhint">
              <span>길게 누르면 여러 장을 고를 수 있어요</span>
              <button className="softbtn softbtn--sm" onClick={onSelectAll}>
                <CheckIcon size={15} />
                전체 선택
              </button>
            </div>
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
              className="softgrid"
              ref={sweep.ref}
              data-dragging={sweep.dragging || undefined}
              {...sweep.handlers}
            >
              {cards.map((card) => (
                <Frame
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

/**
 * 흰 액자에 끼운 사진 한 장.
 *
 * 사진을 판 위에 바로 얹지 않고 흰 여백으로 한 번 둘러싼다. 그래야 회색
 * 바탕 위에서 카드가 '떠 있는 물건'으로 보이고, 사진마다 색이 제각각이어도
 * 격자가 어수선해지지 않는다 — 흰 테가 같은 자리에서 눈을 잡아준다.
 */
const Frame = memo(function Frame({
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
      className="softcard"
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
      <span className="softcard__shot">{url && <img src={url} alt="" loading="lazy" decoding="async" />}</span>
      {selectable && (
        <span className="softcard__check" data-on={selected}>
          {selected && <CheckIcon size={13} />}
        </span>
      )}
      {card.favorite === 1 && showFav && !selectable && (
        <span className="softcard__fav">
          <HeartIcon size={14} filled />
        </span>
      )}
    </button>
  )
})
