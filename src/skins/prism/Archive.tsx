import { memo, type CSSProperties } from 'react'
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
    onTrash,
    onRestore,
    onPurge,
    onEmptyTrash,
  } = view

  /* 좁혀 보고 있는데 비었다면, 비었다는 말과 안 맞는다는 말은 다르다 */
  const filtered = memberId !== null

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
          {!selectMode && (
            <p className="przhint">
              길게 누르면 여러 장을 고를 수 있어요
              <button onClick={onSelectAll}>
                <CheckIcon size={13} />
                전체 선택
              </button>
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
              className="przgrid"
              ref={sweep.ref}
              data-dragging={sweep.dragging || undefined}
              {...sweep.handlers}
            >
              {cards.map((card, index) => (
                <Sleeve
                  key={card.id}
                  card={card}
                  /* 목록은 새것부터 내려오므로 번호도 큰 것부터 내려간다 */
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

/*
 * 카드가 놓이는 각도.
 *
 * 줄끼리 겹치게 하고 나니 겹친 자리가 자로 잰 듯 일직선이라, 세 줄이
 * 한 뭉텅이로 보였다. 손으로 끼운 것은 그렇게 가지런하지 않다.
 *
 * 무작위로 뽑으면 다시 그릴 때마다 카드가 들썩인다. 그래서 카드 id에서
 * 뽑는다 — 같은 카드는 언제 봐도 같은 각도로 누워 있고, 목록을 걸러도
 * 제 각도를 데리고 다닌다.
 */
const MAX_TILT = 2.6
const MAX_NUDGE = 4

function looseOf(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0

  /*
   * 섞는 일이 꼭 필요하다.
   *
   * 그냥 더해 나가기만 하면 끝자리 한 글자 차이가 결과의 끝자리 하나만
   * 바꾼다. 한 번에 올린 카드들은 앞부분이 같고 뒤만 다르므로, 나란히
   * 놓인 카드들이 죄다 같은 각도로 눕는다. 아래 몇 줄은 그 한 비트가
   * 전체에 퍼지게 하는 일이다.
   */
  h ^= h >>> 16
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 13
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 16
  const n = h >>> 0

  // 서로 다른 자리의 비트를 써야 각도와 높이가 같이 움직이지 않는다
  const tilt = ((n & 0xffff) / 0xffff - 0.5) * 2 * MAX_TILT
  const nudge = ((n >>> 16) / 0xffff - 0.5) * 2 * MAX_NUDGE
  return { tilt, nudge }
}

/**
 * 서리유리 슬리브에 꽂힌 한 장.
 *
 * 아래 한 자락만 덮는다. 실제 탑로더는 훨씬 많이 가리지만, 얼굴이
 * 아래쪽에 있는 사진이 적지 않아 크게 덮으면 무엇인지 알아볼 수 없다.
 * 유리에 꽂혀 있다는 것만 말해주면 그걸로 충분하다.
 *
 * 흐림은 뒤를 들여다보는 방식(backdrop-filter)이 아니라, 같은 사진을 한
 * 장 더 깔아 그것을 흐리는 방식이다. 앞의 것은 스크롤할 때마다 뒤를 다시
 * 읽어 값이 크고, 뒤의 것은 한 번 그려두면 그대로 쓰인다. 같은 그림에
 * 값은 훨씬 싸다.
 */
const Sleeve = memo(function Sleeve({
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
  /** 진열대에서 몇 번째인지 */
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
  const loose = looseOf(card.id)

  return (
    <button
      className="przcard"
      style={{ '--tilt': `${loose.tilt}deg`, '--nudge': `${loose.nudge}px` } as CSSProperties}
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
      {/*
        슬리브 안에는 같은 사진을 한 장 더 깔고 흐린다.
        덮개만 씌우면 밑이 또렷해서 '가려진 것'으로 보이지, 유리 너머로
        보이는 것이 아니다. 같은 주소라 브라우저가 디코드한 그림을 다시
        쓰므로 사진을 두 번 읽는 값은 들지 않는다.
      */}
      <span className="przcard__sleeve" aria-hidden="true">
        {url && <img src={url} alt="" />}
        {/*
          슬리브에 새겨 넣은 번호. 진열장의 물건에는 번호표가 붙어 있다.
          세 자리로 맞춰 자릿수가 흔들리지 않게 한다 — 흔들리면 줄마다 끝이
          어긋나 번호가 아니라 글자처럼 읽힌다.

          맨 위가 가장 큰 수다. 목록이 새것부터 내려오니 번호도 같이
          내려가야, 늘어난 만큼 앞의 번호가 밀리지 않는다.
        */}
        <i className="przcard__no">{String(no).padStart(3, '0')}</i>
      </span>
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
