import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { processCroppedImage, type CropTransform, type ProcessedImage } from '@/lib/image'
import { CloseIcon, ResetIcon } from './Icons'
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
 *
 * 비율은 고르게 하지 않는다. 목록·상세·기록 화면이 전부 54:86 틀에 cover로 그리므로
 * 자유 비율로 잘라봐야 화면에서 또 잘린다. 대신 자르기 자체가 선택이라,
 * 규격이 다른 카드는 자르지 않고 통째로 올리면 원본이 그대로 남는다.
 */
/** 잘라낸 조각이 이 높이(원본 픽셀)는 남도록 확대 상한을 정한다 */
const MIN_OUTPUT_EDGE = 480
const MAX_ROTATION = 15

interface View {
  scale: number
  /** 라디안 */
  rotation: number
  x: number
  y: number
}

interface Size {
  w: number
  h: number
}

const IDENTITY: View = { scale: 1, rotation: 0, x: 0, y: 0 }

const rad = (deg: number) => (deg * Math.PI) / 180
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 회전한 사진이 틀을 여전히 덮으려면 얼마나 커야 하는지.
 *
 * 틀을 사진 쪽 좌표로 -θ만큼 돌려 외접 사각형을 재면 나온다.
 * 이 값보다 작게 두면 틀 모서리에 빈 곳이 생긴다.
 */
function minScaleFor(rotation: number, frame: Size, base: Size) {
  if (!base.w || !base.h) return 1
  const c = Math.abs(Math.cos(rotation))
  const s = Math.abs(Math.sin(rotation))
  return Math.max((frame.w * c + frame.h * s) / base.w, (frame.w * s + frame.h * c) / base.h)
}

/**
 * 사진이 밀려나 틀에 빈 곳이 생기지 않게 이동량을 가둔다.
 *
 * 회전이 걸리면 화면 좌표로는 가둘 수 없다. 이동량을 사진 쪽 좌표로 돌려
 * 거기서 자른 뒤 화면 좌표로 되돌린다.
 */
function clampOffset(view: View, frame: Size, base: Size): View {
  const cos = Math.cos(view.rotation)
  const sin = Math.sin(view.rotation)
  // 사진 쪽 좌표 = R(-θ)·이동량
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

/*
 * 사진은 틀 한가운데에 놓고 그 자리에서 옮기고 돌린다.
 * 앞의 -50%는 요소를 제 중심에 앉히는 몫이라(왼쪽 위 50%와 짝) 나머지 변환의
 * 기준점은 건드리지 않는다 — 캔버스에서 다시 그릴 때와 순서가 같아야 한다.
 */
const toCss = (view: View) =>
  `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) ` +
  `rotate(${view.rotation}rad) scale(${view.scale})`

export function CropEditor({ source, onCancel, onDone }: CropEditorProps) {
  const toast = useToast()
  const [natural, setNatural] = useState<Size | null>(null)
  const [url, setUrl] = useState<string>()
  const [view, setView] = useState<View>(IDENTITY)
  const [working, setWorking] = useState(false)
  /** 실제로 그려진 틀의 크기 — 화면 폭에 따라 달라지므로 붙은 뒤에 잰다 */
  const [frame, setFrame] = useState<Size>({ w: 0, h: 0 })
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(source)
    setUrl(objectUrl)
    const img = new Image()
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => toast('사진을 열지 못했습니다.')
    img.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
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
   * (원본이 작으면 상한이 1 밑으로 내려갈 수 있으니 최소 1.6은 남긴다)
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
   * 최신 값을 ref로 따로 들고 다닌다.
   */
  const viewRef = useRef(view)
  const apply = (next: View) => {
    const lo = minScaleFor(next.rotation, frame, base)
    const clamped = clampOffset(
      { ...next, scale: clamp(next.scale, lo, Math.max(lo, maxScale)) },
      frame,
      base,
    )
    viewRef.current = clamped
    setView(clamped)
  }

  const reset = () => {
    viewRef.current = IDENTITY
    setView(IDENTITY)
  }

  /*
   * 손가락 하나면 끌기, 둘이면 확대. 포인터 이벤트 하나로 마우스·터치를 같이 받는다.
   * 확대 기준은 두 손가락의 한가운데라, 보고 있던 자리가 손에서 달아나지 않는다.
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
      const transform: CropTransform = { frame, base, ...view }
      onDone(await processCroppedImage(source, transform))
    } catch (error) {
      toast(error instanceof Error ? error.message : '자르기에 실패했습니다.')
      setWorking(false)
    }
  }

  const degrees = Math.round((view.rotation * 180) / Math.PI)
  const style = { width: base.w || undefined, height: base.h || undefined, transform: toCss(view) }

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
          틀 밖도 흐리게 남겨둔다. 잘려나갈 부분이 아예 안 보이면
          지금 사진의 어디쯤을 보고 있는지 가늠할 수가 없다.
        */}
        <div
          className="crop__stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {url && <img className="crop__spill" src={url} alt="" draggable={false} style={style} />}
          <div className="crop__frame" ref={frameRef}>
            {url && (
              <img className="crop__img" src={url} alt="자를 사진" draggable={false} style={style} />
            )}
            {/* 삼분할 선 — 카드 안 인물을 어디에 둘지 가늠하는 데 쓴다 */}
            <span className="crop__grid" aria-hidden="true" />
          </div>
        </div>

        <div className="crop__controls">
          <label className="crop__slider">
            <span>
              확대 <b>{Math.round((view.scale / Math.max(minScale, 0.001)) * 100)}%</b>
            </span>
            <input
              type="range"
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
          </label>
          <label className="crop__slider">
            <span>
              기울기 <b>{degrees > 0 ? `+${degrees}` : degrees}°</b>
            </span>
            <input
              type="range"
              min={-MAX_ROTATION}
              max={MAX_ROTATION}
              step={0.5}
              value={(view.rotation * 180) / Math.PI}
              onChange={(e) => apply({ ...view, rotation: rad(Number(e.target.value)) })}
              disabled={!ready}
            />
          </label>
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
