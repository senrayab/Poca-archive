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
 * 아틀리에의 보관함 — 작품 목록.
 *
 * 이 스킨은 타이포가 주인공이다. 여섯이 모두 사진을 어떻게 담을지로
 * 갈렸다면 여기는 활자로 갈린다 — 화면 이름은 작은 라벨로, 장수는 큰
 * 숫자로, 카드마다 번호와 날짜가 붙는다.
 *
 * 번호가 붙는 게 요점이다. 같은 격자라도 번호가 매겨지면 '사진 더미'가
 * 아니라 '작품 목록'으로 읽힌다.
 *
 * 층은 그림자가 아니라 선으로 가른다. 앞의 셋은 전부 떠 있는 것으로
 * 층을 갈랐는데, 종이에는 머리카락처럼 얇은 선이 그어질 뿐이다.
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
    <div className="content atl">
      <header className="atlhead">
        <p className="atlhead__label">{selectMode ? '고르는 중' : title}</p>

        {/*
          장수를 큰 숫자로 세운다. 단위는 작게 뒤에 붙인다 — 숫자와 단위를
          같은 크기로 두면 '76장'이 한 낱말이 되어버리고, 숫자가 주인공인
          느낌이 사라진다.
        */}
        <h1 className="atlhead__title">
          {loading ? ' ' : selectMode ? selected.size : cards.length}
          <em>장</em>
        </h1>

        {(selectMode || (mode === 'trash' && cards.length > 0)) && (
          <div className="atlhead__actions" data-picking={selectMode || undefined}>
            {selectMode ? (
              <>
                {mode === 'trash' ? (
                  <>
                    <button className="atlbtn" onClick={onRestore}>
                      <RestoreIcon size={15} />
                      되돌리기
                    </button>
                    <button className="atlbtn atlbtn--on" onClick={onPurge}>
                      <TrashIcon size={15} />
                      완전 삭제
                    </button>
                  </>
                ) : (
                  <button className="atlbtn atlbtn--on" onClick={onTrash}>
                    <TrashIcon size={15} />
                    버리기
                  </button>
                )}
                <button className="atlbtn" onClick={onClearSelection}>
                  <CloseIcon size={15} />
                  그만
                </button>
              </>
            ) : (
              <button className="atlbtn" onClick={onEmptyTrash}>
                <TrashIcon size={15} />
                비우기
              </button>
            )}
          </div>
        )}

        <hr className="atlrule" />
      </header>

      {/*
        멤버는 밑줄도 알약도 없는 활자 목록이다. 지금 고른 것만 검게
        서고 나머지는 종이 빛에 가깝게 물러난다 — 잡지의 꼭지 차례가
        그렇게 놓인다.
      */}
      <div className="atlmembers" role="tablist" aria-label="멤버">
        <button
          className="atlname"
          role="tab"
          aria-selected={memberId === null}
          onClick={() => onSelectMember(null)}
        >
          전체
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            className="atlname"
            role="tab"
            aria-selected={memberId === m.id}
            onClick={() => onSelectMember(memberId === m.id ? null : m.id)}
          >
            {m.name}
          </button>
        ))}
        <button className="atlname atlname--add" onClick={onAddMember} aria-label="멤버 추가">
          <PlusIcon size={14} />
        </button>
      </div>

      {loading ? null : cards.length === 0 ? (
        empty
      ) : (
        <>
          {!selectMode && (
            <p className="atlhint">
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
              className="atlgrid"
              ref={sweep.ref}
              data-dragging={sweep.dragging || undefined}
              {...sweep.handlers}
            >
              {cards.map((card, index) => (
                <Plate
                  key={card.id}
                  card={card}
                  /*
                   * 먼저 들인 것이 01이다. 목록은 새것부터 내려오므로 위가
                   * 가장 큰 수가 된다. 위에서부터 01을 매기면 한 장 들일
                   * 때마다 모든 번호가 한 칸씩 밀려, 어제 본 번호가 오늘은
                   * 다른 카드의 것이 된다.
                   */
                  no={cards.length - index}
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

/** 09.11 처럼 짧게. 목록에서는 연도까지 읽을 일이 없다. */
function shortDate(at: number) {
  const d = new Date(at)
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const Plate = memo(function Plate({
  card,
  no,
  showFav,
  selectable,
  selected,
  onOpen,
  onToggleSelect,
  handledByPress,
}: {
  card: Card
  /** 먼저 들인 것부터 센 번호 */
  no: number
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
      className="atlplate"
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
      <span className="atlplate__shot">
        {url && <img src={url} alt="" loading="lazy" decoding="async" />}
        {selectable && (
          <span className="atlplate__check" data-on={selected}>
            {selected && <CheckIcon size={12} />}
          </span>
        )}
        {card.favorite === 1 && showFav && !selectable && (
          <span className="atlplate__fav">
            <HeartIcon size={13} filled />
          </span>
        )}
      </span>

      {/*
        번호와 날짜. 이 두 줄이 '사진 더미'를 '작품 목록'으로 바꾼다.
        번호는 늘 두 자리로 맞춰 자릿수가 흔들리지 않게 한다.
      */}
      <span className="atlplate__no">{String(no).padStart(2, '0')}</span>
      <span className="atlplate__at">{shortDate(card.createdAt)}</span>
    </button>
  )
})
