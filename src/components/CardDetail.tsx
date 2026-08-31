import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Card, CardStatus } from '@/db/types'
import { useCategories, useMembers } from '@/hooks/useData'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { formatBytes, formatDate } from '@/lib/format'
import {
  ChevronLeft,
  ChevronRight,
  CloseIcon,
  EditIcon,
  HeartIcon,
  RestoreIcon,
  TrashIcon,
} from './Icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface CardDetailProps {
  card: Card
  /** 좌우로 넘겨볼 수 있게 현재 목록을 통째로 받는다 */
  siblings: Card[]
  onNavigate: (card: Card) => void
  onClose: () => void
}

/*
 * 찜할 때 터지는 조각 하나하나.
 * a=각도, d=날아가는 거리, s=지름, t=터지기까지의 시간(ms), c=색.
 *
 * 넷 다 제각각이어야 폭죽처럼 보인다. 거리와 시간을 하나로 맞추면
 * 조각들이 한 줄로 서서 원을 그리며 퍼져, 파문과 겹쳐 보인다.
 */
const BURST_PARTICLES = [
  { a: 4, d: 32, s: 7, t: 0, c: 'var(--fav)' },
  { a: 38, d: 20, s: 6, t: 56, c: '#ffb02e' },
  { a: 71, d: 28, s: 9, t: 18, c: '#4bb8f0' },
  { a: 104, d: 18, s: 6, t: 82, c: '#ffe14d' },
  { a: 133, d: 30, s: 8, t: 8, c: '#8b7cf6' },
  { a: 166, d: 23, s: 7, t: 64, c: '#5ed6a4' },
  { a: 197, d: 34, s: 9, t: 0, c: 'var(--fav)' },
  { a: 224, d: 19, s: 6, t: 92, c: '#ff7ab8' },
  { a: 252, d: 27, s: 8, t: 32, c: '#ffd166' },
  { a: 283, d: 21, s: 6, t: 74, c: '#6ee7c8' },
  { a: 312, d: 31, s: 7, t: 12, c: '#ffb02e' },
  { a: 344, d: 24, s: 9, t: 46, c: '#4bb8f0' },
]

const DISPOSE_OPTIONS: Array<{ status: CardStatus; label: string; hint: string }> = [
  { status: 'traded', label: '양도함', hint: '다른 사람에게 넘긴 카드' },
  { status: 'sold', label: '판매함', hint: '판매로 정리한 카드' },
  { status: 'own', label: '그냥 삭제', hint: '잘못 올렸거나 중복인 카드' },
]

export function CardDetail({ card, siblings, onNavigate, onClose }: CardDetailProps) {
  // 본체 이미지는 팝업을 열 때 그 카드 것만 읽는다 (그리드는 썸네일만 들고 있다).
  const stored = useLiveQuery(() => db.images.get(card.id), [card.id])
  const fullUrl = useObjectUrl(stored?.blob)
  const thumbUrl = useObjectUrl(card.thumb)
  const [fullLoaded, setFullLoaded] = useState(false)
  const members = useMembers()
  const categories = useCategories()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [confirmDispose, setConfirmDispose] = useState(false)
  // 찜을 켤 때마다 1씩 올려, key로 조각 애니메이션을 처음부터 다시 태운다
  const [burst, setBurst] = useState(0)
  const [draft, setDraft] = useState({
    title: card.title,
    memberId: card.memberId,
    categoryId: card.categoryId ?? '',
    memo: card.memo,
  })

  const index = siblings.findIndex((c) => c.id === card.id)
  const prev = index > 0 ? siblings[index - 1] : null
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null

  /*
   * 원본 로딩 상태는 이미지 URL에만 묶는다.
   * 카드 객체에 묶으면(하트 토글처럼) 레코드가 갱신될 때마다 false로 돌아가는데,
   * src는 그대로라 onLoad가 다시 뜨지 않아 블러 플레이스홀더에 갇힌다.
   */
  useEffect(() => {
    setFullLoaded(false)
  }, [fullUrl])

  // 편집 상태는 '다른 카드로 넘어갔을 때'만 초기화한다.
  useEffect(() => {
    setEditing(false)
    setConfirmDispose(false)
    setDraft({
      title: card.title,
      memberId: card.memberId,
      categoryId: card.categoryId ?? '',
      memo: card.memo,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return
      if (e.key === 'ArrowLeft' && prev) onNavigate(prev)
      if (e.key === 'ArrowRight' && next) onNavigate(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, prev, next, onNavigate])

  // 모바일에서 좌우 스와이프로 넘기기
  const touchX = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) < 60) return
    if (dx > 0 && prev) onNavigate(prev)
    if (dx < 0 && next) onNavigate(next)
  }

  const member = members.find((m) => m.id === card.memberId)
  const category = categories.find((c) => c.id === card.categoryId)

  const toggleFavorite = async () => {
    const next = card.favorite === 1 ? 0 : 1
    if (next === 1) setBurst((n) => n + 1)
    await db.cards.update(card.id, { favorite: next, updatedAt: Date.now() })
  }

  const save = async () => {
    const title = draft.title.trim()
    if (!title) return toast('제목을 입력해 주세요.')
    await db.cards.update(card.id, {
      title,
      memberId: draft.memberId,
      categoryId: draft.categoryId || null,
      memo: draft.memo.trim(),
      updatedAt: Date.now(),
    })
    setEditing(false)
    toast('수정했습니다.')
  }

  /** 실제 삭제가 아니라 휴지통으로 보낸다 — 잘못 지웠을 때 되돌릴 수 있게. */
  const dispose = async (status: CardStatus) => {
    await db.cards.update(card.id, {
      deleted: 1,
      deletedAt: Date.now(),
      status,
      updatedAt: Date.now(),
    })
    setConfirmDispose(false)
    toast(status === 'own' ? '휴지통으로 옮겼습니다.' : '휴지통으로 옮겼습니다. 기록은 통계에 남아요.')
    if (next) onNavigate(next)
    else if (prev) onNavigate(prev)
    else onClose()
  }

  const restore = async () => {
    await db.cards.update(card.id, {
      deleted: 0,
      deletedAt: null,
      status: 'own',
      updatedAt: Date.now(),
    })
    toast('보관함으로 되돌렸습니다.')
    onClose()
  }

  return (
    <Modal onClose={onClose} panel={false} label={card.title}>
      {/* 수정 중에는 사진을 줄여 폼 자리를 낸다 (높이 전환은 CSS에서) */}
      <div
        className="detail"
        data-editing={editing}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="detail__top">
          <button className="detail__close" onClick={onClose} aria-label="닫기">
            <CloseIcon size={20} />
          </button>
        </div>

        {/*
          좌우 이동 버튼은 사진 양옆의 빈 칸에 세운다. 사진 위에 얹으면
          반투명이어도 그 부분이 가려져 카드가 잘 안 보인다.
          한쪽이 없을 때도 사진이 가운데 그대로 있도록 칸은 비워서 남긴다.
        */}
        <div className="detail__figure">
          {prev ? (
            <button className="detail__nav" onClick={() => onNavigate(prev)} aria-label="이전 카드">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <span />
          )}

          {/* 스테이지는 실물 카드 비율(54:86)로 고정 — 썸네일과 같은 프레임으로 보인다.
              원본이 디코드될 때까지는 썸네일을 흐리게 깔아 빈 화면을 보이지 않게 한다. */}
          <div className="detail__stage">
            {thumbUrl && (
              <img className="detail__img detail__img--placeholder" src={thumbUrl} alt="" />
            )}
            {fullUrl && (
              <img
                className="detail__img"
                data-loaded={fullLoaded}
                src={fullUrl}
                alt={card.title}
                onLoad={() => setFullLoaded(true)}
                ref={(el) => {
                  // 이미 디코드가 끝난 상태로 붙으면 onLoad가 뜨지 않는다
                  if (el?.complete) setFullLoaded(true)
                }}
              />
            )}

{/*
              찜은 메뉴에 넣지 않고 카드 오른쪽 위에 그냥 띄워둔다.
              누르는 버튼이면서 동시에 '이 카드를 찜했는지' 보여주는 표시라,
              열어봐야 보이는 자리에 두면 표시로서의 값이 사라진다.
            */}
            {!editing && card.deleted !== 1 && (
              <button
                className="detail__fav"
                onClick={toggleFavorite}
                aria-pressed={card.favorite === 1}
                data-on={card.favorite === 1}
                aria-label={card.favorite === 1 ? '찜 해제' : '찜하기'}
                title="찜"
              >
                <HeartIcon size={20} filled={card.favorite === 1} />

                {/* key가 바뀌면 통째로 다시 붙어, 연달아 눌러도 매번 처음부터 터진다 */}
                {burst > 0 && (
                  <span className="fav-burst" key={burst} aria-hidden="true">
                    {BURST_PARTICLES.map((p) => (
                      <span
                        key={p.a}
                        style={
                          {
                            '--a': `${p.a}deg`,
                            '--d': p.d,
                            '--s': p.s,
                            '--t': p.t,
                            '--c': p.c,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                )}
              </button>
            )}

            {/* 카드 위에 얹히는 유리 시트. 판때기가 아니라 사진이 비쳐 보이는 층이다. */}
            {!editing && (
              <div className="detail__sheet">
                <div className="detail__who">
                  {member && <b>{member.name}</b>}
                  {category && <span className="detail__cat">{category.name}</span>}
                </div>
                <h2 className="detail__title">{card.title}</h2>

              </div>
            )}
          </div>

          {next ? (
            <button className="detail__nav" onClick={() => onNavigate(next)} aria-label="다음 카드">
              <ChevronRight size={20} />
            </button>
          ) : (
            <span />
          )}
        </div>

        <div className="detail__info">
          {editing ? (
            <>
              <label className="field">
                <span>제목</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  autoFocus
                />
              </label>
              <div className="row">
                <label className="field">
                  <span>멤버</span>
                  <select
                    value={draft.memberId}
                    onChange={(e) => setDraft({ ...draft, memberId: e.target.value })}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>카테고리</span>
                  <select
                    value={draft.categoryId}
                    onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  >
                    <option value="">없음</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>메모</span>
                <textarea
                  value={draft.memo}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  placeholder="구매처, 교환 상대, 상태 등"
                />
              </label>
            </>
          ) : (
            /* 제목·멤버는 카드 위 유리 시트로 올라갔고, 여기엔 부수 정보만 남는다 */
            <>
              {card.memo && <p className="detail__memo">{card.memo}</p>}
              <div className="detail__meta">
                <span>{formatDate(card.createdAt)}</span>
                <span>
                  {card.width}×{card.height} · {formatBytes(card.bytes)}
                </span>
                <span>{index >= 0 ? `${index + 1} / ${siblings.length}` : ''}</span>
              </div>
            </>
          )}
        </div>

        {/*
          저장/취소는 정보 영역 밖에 둔다. 그 안은 overflow가 걸려 있어
          버튼의 색 그림자가 잘리고, 메모가 길면 버튼이 스크롤로 밀려난다.
        */}
        {editing && (
          <div className="row detail__form-actions">
            <button className="btn" onClick={() => setEditing(false)}>
              취소
            </button>
            <button className="btn btn--primary" onClick={save}>
              저장
            </button>
          </div>
        )}

{/* 찜은 카드 위로 올라갔고, 레일에는 가끔 쓰는 수정·삭제만 남는다 */}
        {!editing && (
          <div className="detail__rail">
            {card.deleted === 1 ? (
              <button className="rail-btn" onClick={restore}>
                <RestoreIcon size={21} />
                <span>복원</span>
              </button>
            ) : (
              <>
                <button className="rail-btn" onClick={() => setEditing(true)}>
                  <EditIcon size={21} />
                  <span>수정</span>
                </button>
                <button
                  className="rail-btn rail-btn--muted"
                  onClick={() => setConfirmDispose(true)}
                >
                  <TrashIcon size={21} />
                  <span>삭제</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {confirmDispose && (
        <Modal onClose={() => setConfirmDispose(false)} label="삭제 사유">
          <h2 className="modal__title">이 카드를 어떻게 정리할까요?</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 14px', lineHeight: 1.6 }}>
            바로 지우지 않고 휴지통으로 옮깁니다. 휴지통에서 되돌리거나 완전히 삭제할 수 있어요.
          </p>
          {DISPOSE_OPTIONS.map((option) => (
            <button
              key={option.status}
              className="btn btn--block"
              style={{ justifyContent: 'flex-start', marginBottom: 8, height: 56 }}
              onClick={() => dispose(option.status)}
            >
              <span style={{ textAlign: 'left' }}>
                <span style={{ display: 'block' }}>{option.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
          <button
            className="btn btn--block btn--ghost"
            onClick={() => setConfirmDispose(false)}
          >
            취소
          </button>
        </Modal>
      )}
    </Modal>
  )
}
