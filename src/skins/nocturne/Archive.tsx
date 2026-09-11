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
import { Backdrop } from './Backdrop'
import type { ArchiveView } from '../types'

/**
 * 녹턴의 보관함 — 밤에 보는 사진첩.
 *
 * 이 스킨은 화면을 사진에 내준다. 머리도 바도 두지 않고, 떠 있는 것만
 * 몇 개 얹는다 — 이름 알약 하나, 오른쪽 기둥, 아래 멤버 줄. 나머지 자리는
 * 위에서 아래까지 전부 사진이다.
 *
 * 그리고 지금 보고 있는 것이 뒤에 크게 흐려져 깔린다. 여태 모든 스킨이
 * 무지 배경이었는데, 여기서는 배경이 곧 제목 노릇을 한다 — 멤버를 바꾸면
 * 화면 전체의 빛깔이 바뀌므로, 무엇을 보고 있는지 글자로 말할 필요가 없다.
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

  /* 꾹 눌러 쓸어 고르기는 스킨을 가리지 않는다 — 손짓은 앱이 하는 일이다 */
  const sweep = useSweepSelect({ cards, selectedIds: selected, onSweep })

  return (
    <div className="content noct">
      {/*
        뒤에 깔리는 사진. 목록이 이미 최근 순이므로 맨 앞이 곧 '지금 고른
        멤버의 최근 카드'다. 따로 찾아 읽을 것이 없다.
      */}
      <Backdrop card={cards[0]} />

      <header className="nocthead">
        <span className="nocthead__name">
          {title}
          {!loading && cards.length > 0 && <b>{cards.length}</b>}
        </span>

        <div className="nocthead__actions">
          {selectMode ? (
            <>
              {mode === 'trash' ? (
                <>
                  <button className="noctbtn" onClick={onRestore} aria-label="되돌리기">
                    <RestoreIcon size={18} />
                  </button>
                  <button className="noctbtn noctbtn--on" onClick={onPurge} aria-label="완전 삭제">
                    <TrashIcon size={18} />
                  </button>
                </>
              ) : (
                <button className="noctbtn noctbtn--on" onClick={onTrash} aria-label="휴지통으로">
                  <TrashIcon size={18} />
                </button>
              )}
              <button className="noctbtn" onClick={onClearSelection} aria-label="그만 고르기">
                <CloseIcon size={18} />
              </button>
            </>
          ) : (
            mode === 'trash' &&
            cards.length > 0 && (
              <button className="noctbtn" onClick={onEmptyTrash} aria-label="휴지통 비우기">
                <TrashIcon size={18} />
              </button>
            )
          )}
        </div>
      </header>

      {/* 걸린 것이 있을 때만. 없으면 사진이 그 자리까지 올라온다. */}
      {(query || byImage) && (
        <div className="noctfind">
          {query && (
            <button className="noctpill noctpill--on" onClick={onClearQuery}>
              <SearchIcon size={13} />
              {query}
              <CloseIcon size={13} />
            </button>
          )}
          {byImage && (
            <button className="noctpill noctpill--on" onClick={onClearByImage}>
              <CameraIcon size={13} />
              닮은 카드 {byImage.length}장
              <CloseIcon size={13} />
            </button>
          )}
        </div>
      )}

      {/*
        멤버는 위, 길찾기는 아래로 갈라 둔다. 위는 무엇을 볼지 고르는
        자리, 아래는 어디로 갈지 고르는 자리다. 둘을 한쪽에 몰면 그쪽이
        답답해지고, 가운데에 남는 사진 자리가 그만큼 줄어든다.
      */}
      <div className="noctmembers" role="tablist" aria-label="멤버">
        <button
          className="noctpill"
          role="tab"
          aria-selected={memberId === null}
          onClick={() => onSelectMember(null)}
        >
          전체
        </button>
        {members.map((m) => (
          <button
            key={m.id}
            className="noctpill"
            role="tab"
            aria-selected={memberId === m.id}
            onClick={() => onSelectMember(memberId === m.id ? null : m.id)}
          >
            {m.name}
          </button>
        ))}
        <button className="noctpill noctpill--add" onClick={onAddMember} aria-label="멤버 추가">
          <PlusIcon size={15} />
        </button>
      </div>

      {loading ? null : cards.length === 0 ? (
        empty
      ) : (
        <>
          {/*
            넉 장씩. 액자도 그림자도 없이 사진끼리 바짝 붙인다 — 어두운
            바탕에서는 사진이 저마다 빛나므로 사이를 벌리지 않아도 서로
            섞이지 않는다. 밝은 스킨에서 흰 테가 하던 일을 어둠이 한다.
          */}
          {!selectMode && (
            <p className="nocthint">
              길게 누르면 여러 장을 고를 수 있어요
              <button onClick={onSelectAll}>
                <CheckIcon size={13} />
                전체 선택
              </button>
            </p>
          )}

          <div
            className="noctgrid"
            ref={sweep.ref}
            data-dragging={sweep.dragging || undefined}
            {...sweep.handlers}
          >
            {cards.map((card) => (
              <Shot
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
        </>
      )}

    </div>
  )
}

const Shot = memo(function Shot({
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
      className="noctshot"
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
        <span className="noctshot__check" data-on={selected}>
          {selected && <CheckIcon size={12} />}
        </span>
      )}
      {card.favorite === 1 && showFav && !selectable && (
        <span className="noctshot__fav">
          <HeartIcon size={13} filled />
        </span>
      )}
    </button>
  )
})
