import { memo } from 'react'
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  HeartIcon,
  PlusIcon,
  RestoreIcon,
  SearchIcon,
  TrashIcon,
} from '@/components/Icons'
import type { Card } from '@/db/types'
import { useMembers } from '@/hooks/useData'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSweepSelect } from '@/hooks/useSweepSelect'
import type { ArchiveView } from '../types'

/**
 * 프리즘의 보관함 — 유리 진열장.
 *
 * 다른 스킨이 '사진을 어떻게 놓을까'를 풀었다면 여기는 '사진을 무엇에
 * 담을까'를 푼다. 카드 한 장 한 장이 서리유리 슬리브에 꽂혀 있다 —
 * 실제로 포카를 탑로더에 끼우면 아래쪽이 유리 너머로 뿌옇게 비치는데,
 * 그 한 자락만 가져왔다.
 *
 * 멤버 줄도 낱개 알약이 아니라 담는 그릇 안의 세그먼트다. 소프트와
 * 녹턴은 알약이 저마다 떠 있는데, 유리는 칸을 나누는 물건이라 한 판
 * 안에서 자리가 갈리는 쪽이 이 스킨의 말이다.
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
    query,
    onClearQuery,
    byImage,
    onClearByImage,
    onTrash,
    onRestore,
    onPurge,
    onEmptyTrash,
  } = view

  const filtered = Boolean(query || byImage)

  /* 꾹 눌러 쓸어 고르기는 스킨을 가리지 않는다 — 손짓은 앱이 하는 일이다 */
  const sweep = useSweepSelect({ cards, selectedIds: selected, onSweep })

  return (
    <div className="content prz">
      <header className="przhead">
        {/* 할 일이 있을 때만 위층이 선다. 평소에는 이름이 맨 위에 혼자다. */}
        {(selectMode || (mode === 'trash' && cards.length > 0)) && (
          <div className="przhead__actions">
            {selectMode ? (
              <>
                <button className="przbtn" onClick={onClearSelection}>
                  <CloseIcon size={16} />
                  그만 고르기
                </button>
                {mode === 'trash' ? (
                  <>
                    <button className="przbtn" onClick={onRestore} aria-label="되돌리기">
                      <RestoreIcon size={16} />
                    </button>
                    <button className="przbtn przbtn--on" onClick={onPurge}>
                      <TrashIcon size={16} />
                      완전 삭제
                    </button>
                  </>
                ) : (
                  <button className="przbtn przbtn--on" onClick={onTrash}>
                    <TrashIcon size={16} />
                    {selected.size}장 버리기
                  </button>
                )}
              </>
            ) : (
              <button className="przbtn" onClick={onEmptyTrash}>
                <TrashIcon size={16} />
                비우기
              </button>
            )}
          </div>
        )}

        <h1 className="przhead__title">{title}</h1>
        {!selectMode && (
          <p className="przhead__sub">
            {loading
              ? ' '
              : cards.length === 0
                ? filtered
                  ? '조건에 맞는 카드가 없어요'
                  : '아직 비어 있어요'
                : `${cards.length}장을 모았어요`}
          </p>
        )}
      </header>

      {(query || byImage) && (
        <div className="przfind">
          {query && (
            <button className="przbtn przbtn--on" onClick={onClearQuery}>
              <SearchIcon size={13} />
              {query}
              <CloseIcon size={13} />
            </button>
          )}
          {byImage && (
            <button className="przbtn przbtn--on" onClick={onClearByImage}>
              <CameraIcon size={13} />
              닮은 카드 {byImage.length}장
              <CloseIcon size={13} />
            </button>
          )}
        </div>
      )}

      {/*
        담는 그릇이 있는 세그먼트. 지금 고른 것만 한 겹 앞으로 나온다 —
        유리는 무엇이 앞에 있는지를 두께로 말하는 물건이다.
      */}
      <div className="przmembers" role="tablist" aria-label="멤버">
        <div className="przmembers__inner">
          <button
            className="przseg"
            role="tab"
            aria-selected={memberId === null}
            onClick={() => onSelectMember(null)}
          >
            전체
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              className="przseg"
              role="tab"
              aria-selected={memberId === m.id}
              onClick={() => onSelectMember(memberId === m.id ? null : m.id)}
            >
              {m.name}
            </button>
          ))}
          <button className="przseg przseg--add" onClick={onAddMember} aria-label="멤버 추가">
            <PlusIcon size={15} />
          </button>
        </div>
      </div>

      {loading ? null : cards.length === 0 ? (
        empty
      ) : (
        <>
          <div
            className="przgrid"
            ref={sweep.ref}
            data-dragging={sweep.dragging || undefined}
            {...sweep.handlers}
          >
            {cards.map((card) => (
              <Sleeve
                key={card.id}
                card={card}
                showFav={mode !== 'favorites'}
                selectable={selectMode}
                selected={selected.has(card.id)}
                onOpen={onOpen}
                onToggleSelect={onToggleSelect}
                handledByPress={sweep.handledByPress}
              />
            ))}
          </div>

          {!selectMode && (
            <p className="przfoot">
              길게 누르면 여러 장을 고를 수 있어요
              <button onClick={onSelectAll}>
                <CheckIcon size={13} />
                전체 선택
              </button>
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 서리유리 슬리브에 꽂힌 한 장.
 *
 * 아래 한 자락만 덮는다. 실제 탑로더는 훨씬 많이 가리지만, 얼굴이
 * 아래쪽에 있는 사진이 적지 않아 크게 덮으면 무엇인지 알아볼 수 없다.
 * 유리에 꽂혀 있다는 것만 말해주면 그걸로 충분하다.
 *
 * 흐림(backdrop-filter)은 쓰지 않았다. 한 화면에 서른 장이 깔리는
 * 자리라 폰에서 값이 너무 크다. 대신 흰 기운을 얇게 덮고 그 위쪽
 * 가장자리에 밝은 실선을 그으면, 작은 크기에서는 같은 그림이 된다.
 */
const Sleeve = memo(function Sleeve({
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
      className="przcard"
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
      <span className="przcard__sleeve" aria-hidden="true" />
      {selectable && (
        <span className="przcard__check" data-on={selected}>
          {selected && <CheckIcon size={12} />}
        </span>
      )}
      {card.favorite === 1 && showFav && !selectable && (
        <span className="przcard__fav">
          <HeartIcon size={14} filled />
        </span>
      )}
    </button>
  )
})
