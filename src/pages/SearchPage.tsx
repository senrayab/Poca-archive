import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/AppShell'
import { CameraCapture, canUseCamera } from '@/components/CameraCapture'
import { CardDetail } from '@/components/CardDetail'
import { CameraIcon, CloseIcon, ImageIcon, SearchIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import type { Card } from '@/db/types'
import { useCards } from '@/hooks/useData'
import { backfillPrints, findLike, fingerprintOf } from '@/lib/duplicates'
import { useLayout } from '@/skins'

/**
 * 찾는 화면.
 *
 * 예전에는 보관함 위에 팝업으로 얹혔다. 목록 맨 위에 붙여두면 한참 내려간
 * 상태에서 찾으려고 매번 올라와야 해서였다. 그런데 길찾기가 아래로 내려온
 * 뒤로 찾기는 '지금 화면에서 여는 것'이 아니라 '가는 곳'이 되었고, 팝업은
 * 가는 곳이 될 수 없다 — 주소가 없으니 뒤로가기가 닿지 않고, 아래 길찾기도
 * 지금 여기가 어디인지 말해주지 못한다.
 *
 * 페이지로 두면 찾는 칸이 위에 서고 그 아래가 통째로 결과 자리가 된다.
 * 몇 장인지만 알려주고 마는 대신, 찾은 카드를 바로 늘어놓을 수 있다.
 *
 * 늘어놓는 일은 스킨의 격자가 맡는다. 보관함과 같은 격자라야 찾아 들어온
 * 화면만 딴 집처럼 보이지 않는다.
 */
export function SearchPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { Grid, detailAsPage } = useLayout()

  const [query, setQuery] = useState('')
  const [openCard, setOpenCard] = useState<Card | null>(null)
  /* 사진으로 찾은 결과. 지문이 닮은 카드의 id만 가까운 순으로 담는다. */
  const [byImage, setByImage] = useState<string[] | null>(null)
  const [looking, setLooking] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [camera] = useState(canUseCamera)
  const pickRef = useRef<HTMLInputElement>(null)

  const cards = useCards({
    query,
    // 찾는 자리는 보관함 전체가 대상이다 — 멤버·분류로 좁히지 않는다
    memberId: null,
    categoryId: null,
    favoriteOnly: false,
    deleted: 0,
  })

  const list = useMemo(() => {
    const all = cards ?? []
    if (!byImage) return all
    // 닮은 순서를 그대로 살린다 — 가장 비슷한 것이 맨 앞이라야 눈에 먼저 든다
    const rank = new Map(byImage.map((id, i) => [id, i]))
    return all.filter((c) => rank.has(c.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
  }, [cards, byImage])

  /*
   * 사진 한 장을 받아 닮은 카드를 찾는다.
   *
   * 이미 가진 카드인지 손에 들고 확인하는 용도라, 받은 사진은 어디에도
   * 저장하지 않는다 — 지문만 뽑고 그림은 그 자리에서 버린다.
   */
  const lookUp = async (file: Blob) => {
    setLooking(true)
    try {
      await backfillPrints()
      const fp = await fingerprintOf(file)
      if (!fp) return toast('사진을 읽지 못했습니다.')
      const hits = await findLike(fp)
      setByImage(hits.map((h) => h.cardId))
      toast(hits.length ? `닮은 카드 ${hits.length}장을 찾았어요.` : '닮은 카드가 없어요.')
    } finally {
      setLooking(false)
    }
  }

  const asking = Boolean(query) || byImage !== null

  return (
    <>
      <Header title="검색" />

      <div className="content">
        <div className="find">
          {/*
            찾는 칸은 위에 붙박아 둔다. 결과를 내려보다가 말을 바꾸고 싶을 때
            맨 위까지 올라오지 않아도 된다 — 팝업이던 시절에 이 자리를 지키려고
            화면을 덮었던 것인데, 붙박아 두면 덮지 않고도 같은 일이 된다.
          */}
          <form className="find__bar" onSubmit={(e) => e.preventDefault()}>
            <SearchIcon size={19} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 · 메모에서 검색"
              autoFocus
              // 찾는 칸에서 자판의 '완료'는 닫는 것이 아니라 자판만 내리는 일이다
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                className="find__clear"
                onClick={() => setQuery('')}
                aria-label="지우기"
              >
                <CloseIcon size={18} />
              </button>
            )}
          </form>

          {/*
            사진으로 찾기. 손에 든 카드를 이미 등록했는지 확인하는 용도라,
            받은 사진은 지문만 뽑고 어디에도 저장하지 않는다.
          */}
          {byImage === null ? (
            <div className="find__ways">
              {camera && (
                <button className="btn btn--sm" onClick={() => setShooting(true)} disabled={looking}>
                  <CameraIcon size={16} />
                  찍어서 찾기
                </button>
              )}
              <button
                className="btn btn--sm"
                onClick={() => pickRef.current?.click()}
                disabled={looking}
              >
                <ImageIcon size={16} />
                골라서 찾기
              </button>
            </div>
          ) : (
            <div className="find__ways">
              <button className="btn btn--sm" onClick={() => setByImage(null)}>
                <CameraIcon size={16} />
                닮은 카드 {byImage.length}장
                <CloseIcon size={16} />
              </button>
            </div>
          )}

          {/* 치는 동안 결과가 이미 걸러지고 있으므로 장수를 바로 알려준다 */}
          <p className="find__count">
            {asking ? `${list.length}장 찾았어요` : '카드 제목과 메모에서 찾습니다'}
          </p>
        </div>

        {asking && list.length === 0 ? (
          <div className="empty">
            <strong>찾는 카드가 없어요</strong>
            <p>다른 말로 찾아보거나, 사진으로 찾아보세요.</p>
          </div>
        ) : (
          <Grid
            cards={asking ? list : []}
            showFav
            selectMode={false}
            selected={EMPTY}
            onOpen={(card) => (detailAsPage ? navigate(`/card/${card.id}`) : setOpenCard(card))}
            onToggleSelect={noop}
          />
        )}
      </div>

      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void lookUp(file)
        }}
      />

      {shooting && (
        <CameraCapture
          onShot={(blob) => {
            setShooting(false)
            void lookUp(blob)
          }}
          onClose={() => setShooting(false)}
        />
      )}

      {openCard && !detailAsPage && (
        <CardDetail
          card={openCard}
          siblings={list}
          onNavigate={setOpenCard}
          onClose={() => setOpenCard(null)}
        />
      )}
    </>
  )
}

/*
 * 찾는 화면에서는 고르지 않는다. 고르는 일은 보관함의 몫이고, 여기서는
 * 무엇이 있는지 보고 한 장을 열면 된다. 빈 묶음과 빈 일을 한 번만 만들어
 * 두는 건 격자가 memo로 감싸여 있어서다 — 매번 새로 만들면 그때마다 다시
 * 그린다.
 */
const EMPTY: Set<string> = new Set()
const noop = () => {}
