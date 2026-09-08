import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ReactNode,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import {
  covers,
  hasTilt,
  toCssTransform,
  IDENTITY_VIEW,
  type CropView,
  type Size,
} from '@/lib/cropGeometry'
import {
  makePreview,
  processCroppedImage,
  type CropTransform,
  type ProcessedImage,
} from '@/lib/image'
import {
  CloseIcon,
  ResetIcon,
  RotateShapeIcon,
  TiltHorizontalIcon,
  TiltVerticalIcon,
  ZoomIcon,
} from './Icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

interface CropEditorProps {
  /** 자를 원본. 업로드 전 파일이거나, 이미 저장해둔 본체 이미지. */
  source: Blob
  onCancel: () => void
  onDone: (result: ProcessedImage) => void
}

/*
 * 틀은 카드 비율로 고정해두고 사진을 그 안에서 움직인다.
 *
 * 반대로(사진을 고정하고 크롭 상자의 모서리를 끄는 방식) 만들면 손잡이를 손가락으로
 * 집어야 하는데, 이 앱은 폰에서 주로 쓴다. 틀을 고정하면 잡을 곳이 사진 전체라
 * 손가락으로도 정확하다.
 */
/** 잘라낸 조각이 이 높이(원본 픽셀)는 남도록 확대 상한을 정한다 */
const MIN_OUTPUT_EDGE = 480
const MAX_ROTATION = 30
/* 원근은 각도가 커질수록 반대편이 급하게 눌린다. 20도면 실제 사진을 세우기에 넉넉하다. */
const MAX_TILT = 20
/* 화면에 띄울 축소본의 긴 변. 원본은 마지막에 자를 때만 다시 읽는다. */
const PREVIEW_MAX_EDGE = 1400

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

/**
 * 기울임 없이 회전만 걸렸을 때, 사진이 틀을 덮으려면 얼마나 커야 하는지.
 * 틀을 사진 쪽 좌표로 -θ만큼 돌려 외접 사각형을 재면 닫힌 식으로 나온다.
 */
function minScaleFor(rotation: number, frame: Size, base: Size) {
  if (!base.w || !base.h) return 1
  const c = Math.abs(Math.cos(rotation))
  const s = Math.abs(Math.sin(rotation))
  return Math.max((frame.w * c + frame.h * s) / base.w, (frame.w * s + frame.h * c) / base.h)
}

/** 기울임 없을 때의 이동 제한. 사진 쪽 좌표로 돌려 자른 뒤 되돌린다. */
function clampOffset(view: CropView, frame: Size, base: Size): CropView {
  const cos = Math.cos(view.rotation)
  const sin = Math.sin(view.rotation)
  const localX = view.x * cos + view.y * sin
  const localY = -view.x * sin + view.y * cos

  const c = Math.abs(cos)
  const s = Math.abs(sin)
  const limitX = Math.max(0, (view.scale * base.w - (frame.w * c + frame.h * s)) / 2)
  const limitY = Math.max(0, (view.scale * base.h - (frame.w * s + frame.h * c)) / 2)

  const nx = clamp(localX, -limitX, limitX)
  const ny = clamp(localY, -limitY, limitY)
  return { ...view, x: nx * cos - ny * sin, y: nx * sin + ny * cos }
}

/**
 * 기울임이 걸렸을 때의 이동·확대 제한.
 *
 * 사진이 사다리꼴이 되면 위의 닫힌 식이 성립하지 않는다. 대신 틀의 네 귀퉁이가
 * 사진 안에 들어왔는지 직접 물어보고 답에 맞춰 되짚는다.
 *
 * 순서가 중요하다. 배율부터 올리면 가장자리를 밀 때마다 사진이 야금야금 커지고,
 * 손을 떼도 돌아오지 않아 밀수록 확대되는 꼴이 된다. 그래서 배율은 '가운데
 * 놓아도 모자랄 때'만 올리고, 그 밖에는 이동만 되돌린다 — 기울임이 없을 때
 * 가장자리에서 딱 멈추는 것과 같은 손맛이 된다.
 */
function settle(view: CropView, frame: Size, base: Size, maxScale: number): CropView {
  if (covers(view, frame, base)) return view
  let v = view

  // 가운데 놓아도 못 덮으면 사진 자체가 틀보다 작다는 뜻이라, 그때만 키운다
  if (!covers({ ...v, x: 0, y: 0 }, frame, base)) {
    for (let i = 0; i < 48; i++) {
      const next = Math.min(v.scale * 1.04, maxScale)
      v = { ...v, scale: next }
      if (next >= maxScale || covers({ ...v, x: 0, y: 0 }, frame, base)) break
    }
    if (covers(v, frame, base)) return v
  }

  // 그 배율에서 이동을 살릴 수 있는 데까지 살린다 (이분 탐색)
  let lo = 0
  let hi = 1
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (covers({ ...v, x: v.x * mid, y: v.y * mid }, frame, base)) lo = mid
    else hi = mid
  }
  return { ...v, x: v.x * lo, y: v.y * lo }
}

/**
 * 각도 슬라이더 한 벌.
 *
 * 이름을 누르면 0도로 돌아온다. 많이 돌려놓고 나면 손가락으로 정확히 0을
 * 짚기가 어려운데, 0은 '안 건드린 상태'라 가장 자주 돌아가고 싶은 자리다.
 */
function AngleSlider({
  label,
  icon,
  value,
  limit,
  disabled,
  onChange,
}: {
  /** 화면에는 안 보이고, 읽어주는 이름으로만 쓴다 */
  label: string
  icon: ReactNode
  /** 라디안 */
  value: number
  /** 슬라이더 양쪽 끝 (도) */
  limit: number
  disabled: boolean
  onChange: (radians: number) => void
}) {
  const degrees = Math.round(deg(value))
  return (
    <div className="crop__slider">
      <button
        type="button"
        className="crop__zero"
        onClick={() => onChange(0)}
        disabled={disabled || degrees === 0}
        aria-label={`${label} 0도로 되돌리기`}
        title={`${label} — 눌러서 0도로`}
      >
        {icon}
        <b>{signed(degrees)}°</b>
      </button>
      <input
        type="range"
        aria-label={label}
        min={-limit}
        max={limit}
        step={0.5}
        value={deg(value)}
        onChange={(e) => onChange(rad(Number(e.target.value)))}
        disabled={disabled}
      />
    </div>
  )
}

export function CropEditor({ source, onCancel, onDone }: CropEditorProps) {
  const toast = useToast()
  const [natural, setNatural] = useState<Size | null>(null)
  const [url, setUrl] = useState<string>()
  const [view, setView] = useState<CropView>(IDENTITY_VIEW)
  const [working, setWorking] = useState(false)
  /** 실제로 그려진 틀의 크기 — 화면 폭에 따라 달라지므로 붙은 뒤에 잰다 */
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const frameRef = useRef<HTMLDivElement>(null)

  /*
   * 사진을 화면에 올리는 일.
   *
   * 원본을 그대로 <img>에 물리면 폰에서 화면이 끊긴다 — 12MP짜리를 두 겹으로
   * 깔면서 그 비용을 두 번 내기 때문이다. 축소본을 한 장 떠서 그걸 쓴다.
   * 원본은 '이대로 자르기'를 누를 때 다시 읽으므로 화질은 손해가 없다.
   */
  useEffect(() => {
    let alive = true
    let objectUrl: string | undefined

    void (async () => {
      try {
        const preview = await makePreview(source, PREVIEW_MAX_EDGE)
        preview.bitmap.close()
        if (!alive) {
          URL.revokeObjectURL(preview.url)
          return
        }
        objectUrl = preview.url
        // 확대 상한은 원본 픽셀 기준이라, 축소본이 아니라 원본 크기를 물려준다
        setNatural({ w: preview.naturalWidth, h: preview.naturalHeight })
        setUrl(preview.url)
      } catch (error) {
        if (alive) toast(error instanceof Error ? error.message : '사진을 열지 못했습니다.')
      }
    })()

    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    // 크기가 그대로면 상태를 건드리지 않는다 — 매번 새 객체를 넣으면 공연히 다시 그린다
    const measure = () =>
      setFrame((prev) =>
        prev.w === el.clientWidth && prev.h === el.clientHeight
          ? prev
          : { w: el.clientWidth, h: el.clientHeight },
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /*
   * scale 1 = '틀을 꽉 채우는 크기'. 원본 비율이 어떻든 여기서 시작하므로
   * 최소 확대가 늘 1이 되어, 슬라이더도 손가락도 다루기 쉽다.
   */
  const base = useMemo<Size>(() => {
    if (!natural || !frame.w) return { w: 0, h: 0 }
    const fit = Math.max(frame.w / natural.w, frame.h / natural.h)
    return { w: natural.w * fit, h: natural.h * fit }
  }, [natural, frame])

  /*
   * 너무 당겨 자르면 남는 원본 픽셀이 얼마 없어, 늘려 저장해도 뿌옇다.
   * 상한을 걸어 애초에 그 지점을 못 넘게 한다 — 다 자른 뒤 경고하는 것보다 조용하다.
   */
  const maxScale = useMemo(() => {
    if (!natural || !base.h) return 3
    return clamp((frame.h * (natural.h / base.h)) / MIN_OUTPUT_EDGE, 1.6, 8)
  }, [natural, base, frame])

  const minScale = minScaleFor(view.rotation, frame, base)
  const zoomMax = Math.max(maxScale, minScale)
  const ready = Boolean(url && natural && frame.w && base.w)

  /*
   * 손가락은 렌더보다 빠르다. 한 프레임 안에 move가 여러 번 들어오면 state는
   * 아직 옛 값이라, 그걸 기준으로 더하면 앞선 움직임이 통째로 지워진다.
   */
  const viewRef = useRef(view)
  const apply = (next: CropView) => {
    const lo = minScaleFor(next.rotation, frame, base)
    const hi = Math.max(lo, maxScale)
    const scaled: CropView = { ...next, scale: clamp(next.scale, lo, hi) }
    // 기울임이 없으면 닫힌 식이 정확하고 빠르다. 있을 때만 더듬어 찾는다.
    const settled = hasTilt(scaled)
      ? settle(scaled, frame, base, hi)
      : clampOffset(scaled, frame, base)
    viewRef.current = settled
    setView(settled)
  }

  const reset = () => {
    viewRef.current = IDENTITY_VIEW
    setView(IDENTITY_VIEW)
  }

  /*
   * 손가락 하나면 끌기, 둘이면 확대. 포인터 이벤트 하나로 마우스·터치를 같이 받는다.
   */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number; x: number; y: number } | null>(null)

  const startPinch = () => {
    const pts = [...pointers.current.values()]
    if (pts.length < 2) {
      pinch.current = null
      return
    }
    const v = viewRef.current
    pinch.current = {
      dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
      scale: v.scale,
      x: v.x,
      y: v.y,
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ready) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    startPinch()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !ready) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const v = viewRef.current
    const pts = [...pointers.current.values()]

    if (pts.length >= 2 && pinch.current) {
      const g = pinch.current
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const ratio = dist / g.dist
      // 이동량도 같은 비율로 늘려야 손가락 사이의 그 지점이 제자리에 남는다
      apply({ ...v, scale: g.scale * ratio, x: g.x * ratio, y: g.y * ratio })
      return
    }

    apply({ ...v, x: v.x + (e.clientX - prev.x), y: v.y + (e.clientY - prev.y) })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    pinch.current = null
    // 하나가 떨어져 다시 둘이 되면 기준을 새로 잡는다
    if (pointers.current.size >= 2) startPinch()
  }

  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!ready) return
    const v = viewRef.current
    apply({ ...v, scale: v.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08) })
  }

  const confirm = async () => {
    if (!ready) return
    setWorking(true)
    try {
      const transform: CropTransform = { frame, base, view }
      onDone(await processCroppedImage(source, transform))
    } catch (error) {
      toast(error instanceof Error ? error.message : '자르기에 실패했습니다.')
      setWorking(false)
    }
  }

  const style = {
    width: base.w || undefined,
    height: base.h || undefined,
    transform: toCssTransform(view, frame),
  }

  return (
    <Modal onClose={onCancel} panel={false} label="사진 자르기">
      <div className="crop">
        <div className="crop__top">
          <span className="crop__hint">끌어서 맞추세요 · 틀 밖은 저장되지 않아요</span>
          <button className="detail__close" onClick={onCancel} aria-label="닫기">
            <CloseIcon size={20} />
          </button>
        </div>

        {/*
          틀 밖도 어둡게 남겨둔다. 잘려나갈 부분이 아예 안 보이면
          지금 사진의 어디쯤을 보고 있는지 가늠할 수가 없다.

          손가락으로 확대하려고 짚고 있으면 폰이 '이미지 저장·복사' 메뉴를 띄운다.
          사진에서 손을 떼어(pointer-events) 누를 대상이 이미지가 아니게 하고,
          그래도 새어 나오는 경우를 대비해 메뉴 자체도 막는다.
        */}
        <div
          className="crop__stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {!ready && <span className="crop__loading">사진 여는 중…</span>}
          {ready && <img className="crop__spill" src={url} alt="" draggable={false} style={style} />}
          <span className="crop__scrim" aria-hidden="true" />
          <div className="crop__frame" ref={frameRef}>
            {ready && (
              <img className="crop__img" src={url} alt="자를 사진" draggable={false} style={style} />
            )}
            {/* 삼분할 선 — 카드 안 인물을 어디에 둘지 가늠하는 데 쓴다 */}
            <span className="crop__grid" aria-hidden="true" />
          </div>
        </div>

        <div className="crop__controls">
          <div className="crop__slider">
            <button
              type="button"
              className="crop__zero"
              onClick={() => apply({ ...view, scale: minScale })}
              disabled={!ready || view.scale <= minScale + 0.001}
              aria-label="확대 되돌리기"
              title="확대 — 눌러서 딱 맞는 크기로"
            >
              <ZoomIcon size={15} />
              <b>{Math.round((view.scale / Math.max(minScale, 0.001)) * 100)}%</b>
            </button>
            <input
              type="range"
              aria-label="확대"
              min={0}
              max={1000}
              value={clamp(
                ((view.scale - minScale) / Math.max(zoomMax - minScale, 0.001)) * 1000,
                0,
                1000,
              )}
              onChange={(e) =>
                apply({
                  ...view,
                  scale: minScale + (Number(e.target.value) / 1000) * (zoomMax - minScale),
                })
              }
              disabled={!ready}
            />
          </div>
          <AngleSlider
            label="돌리기"
            icon={<RotateShapeIcon size={15} />}
            value={view.rotation}
            limit={MAX_ROTATION}
            disabled={!ready}
            onChange={(rotation) => apply({ ...view, rotation })}
          />

          {/*
            원근 두 개. 비스듬히 찍혀 사다리꼴이 된 카드를 반듯하게 편다.
            위아래는 윗변을 눕히거나 세우고, 좌우는 옆면을 앞뒤로 돌린다.
          */}
          <AngleSlider
            label="위아래 세우기"
            icon={<TiltVerticalIcon size={15} />}
            value={view.tiltX}
            limit={MAX_TILT}
            disabled={!ready}
            onChange={(tiltX) => apply({ ...view, tiltX })}
          />
          <AngleSlider
            label="좌우 세우기"
            icon={<TiltHorizontalIcon size={15} />}
            value={view.tiltY}
            limit={MAX_TILT}
            disabled={!ready}
            onChange={(tiltY) => apply({ ...view, tiltY })}
          />
        </div>

        <div className="row crop__actions">
          <button className="btn" onClick={reset} disabled={!ready}>
            <ResetIcon size={17} />
            되돌리기
          </button>
          <button className="btn btn--primary" onClick={confirm} disabled={!ready || working}>
            {working ? '자르는 중…' : '이대로 자르기'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
