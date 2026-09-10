import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { Card, CardStatus } from '@/db/types'
import { useCategories, useMembers } from '@/hooks/useData'
import { useBackClose } from '@/hooks/useBackClose'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { formatBytes, formatDate } from '@/lib/format'
import { fingerprintOf } from '@/lib/duplicates'
import { SHOW_CATEGORY } from '@/lib/features'
import { processImage, type ProcessedImage } from '@/lib/image'
import { CropEditor } from './CropEditor'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloseIcon,
  CropIcon,
  EditIcon,
  HeartIcon,
  ImageSwapIcon,
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
  { a: 4, d: 32, s: 9, t: 0, c: 'var(--fav)' },
  { a: 38, d: 20, s: 8, t: 56, c: '#ffb02e' },
  { a: 71, d: 28, s: 12, t: 18, c: '#4bb8f0' },
  { a: 104, d: 18, s: 8, t: 82, c: '#ffe14d' },
  { a: 133, d: 30, s: 11, t: 8, c: '#8b7cf6' },
  { a: 166, d: 23, s: 9, t: 64, c: '#5ed6a4' },
  { a: 197, d: 34, s: 12, t: 0, c: 'var(--fav)' },
  { a: 224, d: 19, s: 8, t: 92, c: '#ff7ab8' },
  { a: 252, d: 27, s: 11, t: 32, c: '#ffd166' },
  { a: 283, d: 21, s: 8, t: 74, c: '#6ee7c8' },
  { a: 312, d: 31, s: 9, t: 12, c: '#ffb02e' },
  { a: 344, d: 24, s: 12, t: 46, c: '#4bb8f0' },
]

const DISPOSE_OPTIONS: Array<{ status: CardStatus; label: string; hint: string }> = [
  { status: 'traded', label: '양도함', hint: '다른 사람에게 넘긴 카드' },
  { status: 'sold', label: '판매함', hint: '판매로 정리한 카드' },
  { status: 'own', label: '그냥 삭제', hint: '잘못 올렸거나 중복인 카드' },
]

export function CardDetail({ card, siblings, onNavigate, onClose }: CardDetailProps) {
  // 본체 이미지는 팝업을 열 때 그 카드 것만 읽는다 (그리드는 썸네일만 들고 있다).
  const stored = useLiveQuery(() => db.images.get(card.id), [card.id])
  /*
   * 라이브 쿼리는 카드를 넘긴 직후 한 렌더 동안 이전 카드의 사진을 그대로 들고 있다.
   * cardId를 확인하지 않으면 그 사진으로 URL이 만들어져, 제목과 멤버만 바뀌고
   * 사진은 앞 카드에 머문다.
   */
  const image = stored?.cardId === card.id ? stored : undefined
  const fullUrl = useObjectUrl(image?.blob, card.id)
  const thumbUrl = useObjectUrl(card.thumb, card.id)
  const [fullLoaded, setFullLoaded] = useState(false)
  const members = useMembers()
  const categories = useCategories()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [confirmDispose, setConfirmDispose] = useState(false)
  /*
   * 새로 고른 사진은 바로 넣지 않고 여기에 들고 있는다.
   * 제목·멤버와 같은 '저장'에 묶어야, 취소로 되돌릴 수 있고
   * 사진만 바뀐 채 폼을 빠져나가는 일이 없다.
   */
  const [pending, setPending] = useState<ProcessedImage | null>(null)
  /*
   * 새로 고른 파일의 원본. 자르기는 변환본이 아니라 이걸로 해야 화질이 온전하다.
   * (이미 저장된 사진을 자를 때는 본체 이미지를 원본 삼는 수밖에 없다)
   */
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [swapping, setSwapping] = useState(false)
  const [cropping, setCropping] = useState(false)
  /*
   * 고친 걸 버리고 나가려 할 때 한 번 붙잡는다.
   * 'edit'는 수정만 그만두는 길, 'popup'은 팝업까지 닫는 길이다 —
   * 물어보는 창은 같고 예 다음에 갈 곳만 다르다.
   */
  const [askSave, setAskSave] = useState<'edit' | 'popup' | null>(null)
  /*
   * 사진 위에 얹힌 메모는 한 줄로 줄여 두고, 길면 눌러서 펼친다.
   * 길지 않은데도 펼치기 표시를 달아두면 눌러도 달라지는 게 없어 성가시므로,
   * 실제로 잘렸는지 재어 보고 그때만 단추로 만든다.
   */
  const [memoOpen, setMemoOpen] = useState(false)
  const [memoClipped, setMemoClipped] = useState(false)
  const memoRef = useRef<HTMLSpanElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // 아직 저장 전인 새 사진 — 있으면 이게 스테이지를 차지한다
  const pendingUrl = useObjectUrl(pending?.full.blob)
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
    setPending(null)
    setPendingFile(null)
    setCropping(false)
    setAskSave(null)
    setDraft({
      title: card.title,
      memberId: card.memberId,
      categoryId: card.categoryId ?? '',
      memo: card.memo,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  /* 줄인 상태에서만 잴 수 있다 — 펼쳐 놓으면 넘치는 게 없어 늘 '안 잘림'으로 나온다 */
  useEffect(() => {
    if (memoOpen) return
    const el = memoRef.current
    setMemoClipped(el ? el.scrollWidth > el.clientWidth + 1 : false)
  }, [card.id, card.memo, editing, memoOpen])

  useEffect(() => {
    setMemoOpen(false)
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

  // 자를 대상: 새로 고른 파일이 있으면 그 원본, 없으면 저장된 본체 이미지
  const cropSource: Blob | null = pendingFile ?? image?.blob ?? null

  const member = members.find((m) => m.id === card.memberId)
  const category = categories.find((c) => c.id === card.categoryId)
  // 하트를 띄울 때만 사진 모서리를 파낸다 — 안 그러면 빈 구멍만 남는다
  const showFav = !editing && card.deleted !== 1

  /*
   * 사진을 두 번 두드리면 찜한다.
   *
   * 찜을 '푸는' 일은 하지 않는다. 두드리기는 사진을 보다가 무심코 하는 손짓이라
   * 하트를 누르는 것만큼 뜻이 분명하지 않은데, 풀어버리면 되돌릴 방법이
   * 눈에 띄지 않는다. 푸는 건 하트 버튼 몫으로 남긴다.
   *
   * 브라우저에는 터치용 더블탭 이벤트가 없어 직접 잰다. 두 번째 탭이 앞의 것과
   * 시간·거리 안에 들어와야 한 쌍으로 친다. 거리를 보는 덕에 좌우로 넘기는
   * 손짓은 걸리지 않는다 (그건 60px 넘게 움직여야 한다).
   */
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null)
  const onPhotoTap = (e: React.PointerEvent) => {
    if (!showFav) return
    const now = Date.now()
    const prev = lastTap.current
    if (prev && now - prev.at < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 32) {
      lastTap.current = null
      // 이미 찜한 카드는 그대로 두고 한 번 더 터뜨리기만 한다 — 두드림이
      // 먹히지 않은 게 아니라 '이미 찜해둔 카드'라는 답이 된다
      if (card.favorite === 1) setBurst((n) => n + 1)
      else void toggleFavorite()
      return
    }
    lastTap.current = { at: now, x: e.clientX, y: e.clientY }
  }

  const toggleFavorite = async () => {
    const next = card.favorite === 1 ? 0 : 1
    if (next === 1) setBurst((n) => n + 1)
    await db.cards.update(card.id, { favorite: next, updatedAt: Date.now() })
  }

  /** 수정 중 사진 교체 — 올릴 때와 똑같이 WebP로 줄여 두었다가 저장할 때 넣는다. */
  const pickImage = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('이미지 파일만 올릴 수 있어요.')
    setSwapping(true)
    try {
      setPending(await processImage(file))
      setPendingFile(file)
      toast('사진을 바꿨어요. 저장을 눌러야 반영됩니다.')
    } catch (error) {
      toast(error instanceof Error ? error.message : '이미지를 처리하지 못했습니다.')
    } finally {
      setSwapping(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setPending(null)
    setPendingFile(null)
  }

  /** 저장을 눌러야 반영되는 것들 중 하나라도 손댔는가 */
  const dirty =
    draft.title !== card.title ||
    draft.memberId !== card.memberId ||
    (draft.categoryId || null) !== (card.categoryId ?? null) ||
    draft.memo !== card.memo ||
    pending !== null

  /** 수정만 그만둘 때 (취소 버튼) */
  const requestCancel = () => {
    if (dirty) setAskSave('edit')
    else cancelEdit()
  }

  /** 팝업 자체를 닫을 때 (닫기 버튼·바깥 누르기·ESC) */
  const requestClose = () => {
    if (editing && dirty) setAskSave('popup')
    else onClose()
  }

  /*
   * 폰 뒤로가기를 이 팝업에만 붙인다.
   *
   * 상세보기는 사람이 보기에 한 페이지라 뒤로가기로 닫히는 게 자연스럽다.
   * 반면 수정·자르기는 저장이나 닫기 단추로 끝내는 자리고, 확인창은 답을
   * 골라야 하는 자리다. 그래서 이 안에서 열린 것이 있으면 그것부터 한 겹
   * 벗기고, 남은 게 없을 때 팝업을 닫는다.
   */
  useBackClose(() => {
    if (askSave) setAskSave(null)
    else if (confirmDispose) setConfirmDispose(false)
    else if (cropping) setCropping(false)
    else requestClose()
  })

  const save = async () => {
    // 제목은 없어도 된다. 적어둘 말이 있을 때만 적는 자리다.
    const title = draft.title.trim()
    // 사진을 갈아 끼웠으면 지문도 새 그림의 것으로 바꾼다 (안 그러면 중복 검사가 엉뚱해진다)
    const fp = pending ? await fingerprintOf(pending.thumb.blob) : null

    await db.transaction('rw', db.cards, db.images, db.prints, async () => {
      await db.cards.update(card.id, {
        title,
        memberId: draft.memberId,
        categoryId: draft.categoryId || null,
        memo: draft.memo.trim(),
        updatedAt: Date.now(),
        // 사진을 갈아 끼웠으면 썸네일과 크기·용량도 같이 새 것으로 바꾼다
        ...(pending && {
          thumb: pending.thumb.blob,
          width: pending.full.width,
          height: pending.full.height,
          bytes: pending.full.blob.size + pending.thumb.blob.size,
        }),
      })
      if (pending) {
        await db.images.put({ cardId: card.id, blob: pending.full.blob })
        if (fp) await db.prints.put({ cardId: card.id, fp })
        else await db.prints.delete(card.id)
      }
    })
    setPending(null)
    setPendingFile(null)
    setEditing(false)
    toast('수정했습니다.')
    return true
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
    <Modal
      onClose={requestClose}
      panel={false}
      // 고치는 중에는 딤을 눌러도 아무 일이 없다 — 나갈 길은 취소와 저장이 낸다
      closeOnScrim={!editing}
      /* 제목이 없을 수 있으므로 읽어줄 이름은 있는 것 중에서 고른다 */
      label={card.title || member?.name || '포토카드'}
    >
      {/* 수정 중에는 사진을 줄여 폼 자리를 낸다 (높이 전환은 CSS에서) */}
      <div
        className="detail"
        data-editing={editing}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/*
          수정 중에는 닫기를 두지 않는다. 아래에 취소와 저장이 있어 나갈 길이
          분명하고, 그 둘은 고친 것을 어떻게 할지까지 정해준다. 줄을 통째로
          걷어내면 좁은 화면에서 폼이 그만큼 넓어진다.
        */}
        {!editing && (
          <div className="detail__top">
            <button className="detail__close" onClick={requestClose} aria-label="닫기">
              <CloseIcon size={20} />
            </button>
          </div>
        )}

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
            {/* 사진만 이 층에서 잘린다. 하트와 조각은 밖에 있어야 구멍 밖으로 나갈 수 있다. */}
            <div
              className="detail__canvas"
              data-cut={showFav || undefined}
              onPointerUp={onPhotoTap}
            >
              {pendingUrl ? (
                /* 새로 고른 사진은 이미 손에 있으니 흐린 밑그림 없이 바로 보여준다 */
                <img className="detail__img" src={pendingUrl} alt="새로 고른 사진" />
              ) : (
                <>
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
                </>
              )}
            </div>

            {/*
              수정 중에는 사진 자체가 '사진 바꾸기' 버튼이 된다.
              누를 수 있다는 걸 알 수 있게 오른쪽 아래에 작은 배지를 띄운다 —
              배지만 누르게 하면 손가락으로는 너무 작아, 판정은 사진 전체로 둔다.
            */}
            {editing && (
              <button
                className="detail__pick"
                onClick={() => fileRef.current?.click()}
                disabled={swapping}
                aria-label="사진 바꾸기"
                title="사진 바꾸기"
              >
                <span className="detail__pick-badge" data-busy={swapping || undefined}>
                  <ImageSwapIcon size={16} />
                </span>
              </button>
            )}

            {/*
              자르기는 '바꾸기' 버튼의 자식이 아니라 그 위에 얹은 형제다.
              안에 넣으면 배지를 눌러도 사진 전체 버튼이 같이 열린다.
              대상은 지금 보이는 사진 — 새로 고른 게 있으면 그것, 없으면 저장된 것.
            */}
            {editing && cropSource && (
              <button
                className="detail__crop"
                onClick={() => setCropping(true)}
                aria-label="사진 자르기"
                title="사진 자르기"
              >
                <CropIcon size={16} />
              </button>
            )}

            {/*
              찜은 메뉴에 넣지 않고 카드 오른쪽 위에 그냥 띄워둔다.
              누르는 버튼이면서 동시에 '이 카드를 찜했는지' 보여주는 표시라,
              열어봐야 보이는 자리에 두면 표시로서의 값이 사라진다.
            */}
            {showFav && (
              <button
                className="detail__fav"
                onClick={toggleFavorite}
                aria-pressed={card.favorite === 1}
                data-on={card.favorite === 1}
                aria-label={card.favorite === 1 ? '찜 해제' : '찜하기'}
                title="찜"
              >
                <HeartIcon size={22} filled={card.favorite === 1} />

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
                {/* 유리는 별도 층이다 — 마스크로 윗경계를 흐리려면 글자와 분리돼야 한다 */}
                <span className="detail__glass" aria-hidden="true" />
                {/*
                  분류를 감춰둔 동안에는 그 자리에 메모가 들어간다.
                  분류 대신 메모에 알아볼 말을 적는 쪽을 쓰기로 했으므로,
                  사진 위에서 바로 읽히는 자리는 메모가 갖는 게 맞다.
                */}
                <div className="detail__who">
                  {member && <b>{member.name}</b>}
                  {SHOW_CATEGORY
                    ? category && <span className="detail__cat">{category.name}</span>
                    : card.memo && (
                        <button
                          type="button"
                          className="detail__cat detail__memo-line"
                          data-open={memoOpen || undefined}
                          disabled={!memoClipped && !memoOpen}
                          onClick={() => setMemoOpen((open) => !open)}
                          aria-expanded={memoOpen}
                          aria-label={memoOpen ? '메모 접기' : '메모 펼치기'}
                        >
                          <span className="detail__memo-text" ref={memoRef}>
                            {card.memo}
                          </span>
                          {(memoClipped || memoOpen) &&
                            (memoOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                        </button>
                      )}
                </div>
                {card.title && <h2 className="detail__title">{card.title}</h2>}

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
                  placeholder="비워두셔도 됩니다"
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
                {SHOW_CATEGORY && (
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
                )}
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
              {/* 분류를 감춰둔 동안에는 메모가 사진 위로 올라가므로 여기서는 뺀다 */}
              {SHOW_CATEGORY && card.memo && <p className="detail__memo">{card.memo}</p>}
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
            <button className="btn" onClick={requestCancel}>
              취소
            </button>
            <button className="btn btn--primary" onClick={save}>
              저장
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            // 같은 파일을 다시 골라도 change가 뜨도록 값을 비운다
            e.target.value = ''
            void pickImage(file)
          }}
        />

{/* 찜은 카드 위로 올라갔고, 레일에는 가끔 쓰는 수정·삭제만 남는다 */}
        {!editing && (
          <div className="detail__rail">
            {card.deleted === 1 ? (
              /*
               * 사진을 지운 기록은 되돌릴 것이 없다. 되돌려 봐야 원본 없는
               * 카드가 보관함에 서고, 크게 보면 흐린 썸네일뿐이다. 복원을
               * 막는 대신 왜 없는지를 그 자리에 적는다.
               */
              card.photoGone === 1 ? (
                <p className="detail__gone">사진은 지웠고 기록만 남아 있어요</p>
              ) : (
                <button className="rail-btn" onClick={restore}>
                  <RestoreIcon size={21} />
                  <span>복원</span>
                </button>
              )
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

      {askSave && (
        <Modal onClose={() => setAskSave(null)} label="변경사항">
          <h2 className="modal__title">변경사항을 저장할까요?</h2>
          <p className="modal__note">저장하지 않으면 고친 내용이 사라집니다.</p>
          <button
            className="btn btn--primary btn--block"
            onClick={() => {
              const exit = askSave === 'popup'
              void save().then((saved) => {
                if (!saved) return
                setAskSave(null)
                if (exit) onClose()
              })
            }}
          >
            저장
          </button>
          <button
            className="btn btn--block"
            style={{ marginTop: 8 }}
            onClick={() => {
              const exit = askSave === 'popup'
              setAskSave(null)
              cancelEdit()
              if (exit) onClose()
            }}
          >
            저장 안 함
          </button>
          <button
            className="btn btn--block btn--ghost"
            style={{ marginTop: 8 }}
            onClick={() => setAskSave(null)}
          >
            취소
          </button>
        </Modal>
      )}

      {cropping && cropSource && (
        <CropEditor
          source={cropSource}
          onCancel={() => setCropping(false)}
          onDone={(processed) => {
            setPending(processed)
            setCropping(false)
            toast('잘랐어요. 저장을 눌러야 반영됩니다.')
          }}
        />
      )}

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
