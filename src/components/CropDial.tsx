import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode, CSSProperties } from 'react'

/**
 * 손잡이 하나. 눈금자 위에서 이 값 하나를 움직인다.
 *
 * 단위는 손잡이마다 다르다 (각도는 도, 확대는 퍼센트). 눈금자는 단위를 모르고
 * 숫자만 다루므로, 무엇을 재는지는 이 표가 전부 들고 있다.
 */
export interface DialKnob {
  key: string
  /** 읽어주는 이름 (화면에는 아이콘만 나온다) */
  label: string
  icon: ReactNode
  value: number
  min: number
  max: number
  /** 손잡이를 한 번 더 누르면 돌아갈 자리 */
  rest: number
  /** 눈금 한 칸이 몇 단위인가 */
  tick: number
  /** 몇 칸마다 굵은 눈금을 긋나 */
  majorEvery: number
  /** 한 단위가 화면에서 몇 px인가 — 손이 얼마나 예민하게 움직일지를 정한다 */
  pxPerUnit: number
  format: (value: number) => string
  onChange: (value: number) => void
}

/*
 * 눈금자를 놓았을 때 rest에서 이만큼 안쪽이면 딱 붙여준다.
 * 0도는 '안 건드린 상태'라 가장 자주 돌아가고 싶은 자리인데,
 * 손가락으로 정확히 짚기는 제일 어렵다.
 */
const SNAP = 0.7

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/*
 * 눈금은 캔버스에 그린다.
 *
 * 되풀이되는 배경 그림으로 깔면 칸마다 다르게 그릴 수가 없다 — 구간 눈금만
 * 밝게 하거나, 끝값에서 눈금을 멈추거나, 끝을 둥글게 하는 게 모두 안 된다.
 * 한 칸씩 직접 그리면 그게 다 되고, 보이는 범위만 도므로 한 번에 수십 개다.
 */
/** 눈금은 길이가 모두 같다. 구간은 길이가 아니라 밝기로 나눈다. */
const TICK_LENGTH = 0.38
const TICK_WIDTH = 2
const TICK_DIM = 'rgba(255, 255, 255, .34)'
const TICK_MARK = 'rgba(255, 255, 255, .92)'
/** 이 지점부터 양끝까지만 흐려진다 — 눈금이 툭 나타났다 사라지지 않게 */
const EDGE = 0.86

function drawRuler(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  knob: DialKnob,
) {
  const ratio = Math.min(3, window.devicePixelRatio || 1)
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineWidth = TICK_WIDTH

  const center = width / 2
  const middle = height / 2
  const half = (height * TICK_LENGTH) / 2
  const reach = center / knob.pxPerUnit
  const steps = Math.round(knob.value / knob.tick)

  for (let i = steps - Math.ceil(reach / knob.tick) - 1; ; i++) {
    const value = i * knob.tick
    const x = center + (value - knob.value) * knob.pxPerUnit
    if (x > width + 2) break
    if (x < -2) continue
    // 끝값 너머로는 긋지 않는다 — 더 갈 곳이 없다는 게 눈에 보인다
    if (value < knob.min - 1e-9 || value > knob.max + 1e-9) continue
    // 바늘이 서 있는 자리는 비워둔다 (바늘이 그 칸을 대신한다)
    if (Math.abs(x - center) < TICK_WIDTH) continue

    const away = Math.min(1, Math.abs(x - center) / center)
    const fade = away > EDGE ? Math.max(0, 1 - (away - EDGE) / (1 - EDGE)) : 1

    ctx.globalAlpha = fade
    ctx.strokeStyle = i % knob.majorEvery === 0 ? TICK_MARK : TICK_DIM
    ctx.beginPath()
    ctx.moveTo(x, middle - half)
    ctx.lineTo(x, middle + half)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/**
 * 손잡이 여러 개를 눈금자 하나로 돌려 쓴다.
 *
 * 손잡이마다 슬라이더를 하나씩 두면 줄이 그만큼 늘어난다. 폰에서는 그 높이가
 * 곧 사진이 작아지는 값이라, 한 번에 하나만 만진다는 사실을 그대로 화면에 옮겼다 —
 * 고른 것 하나만 하얗게 켜지고, 눈금자는 늘 그 하나를 가리킨다.
 */
export function CropDial({ knobs, disabled }: { knobs: DialKnob[]; disabled: boolean }) {
  const [activeKey, setActiveKey] = useState(knobs[0]?.key)
  const [dragging, setDragging] = useState(false)
  const active = knobs.find((k) => k.key === activeKey) ?? knobs[0]
  const drag = useRef<{ x: number; value: number } | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // 눈금자 크기는 화면 폭을 따라가므로 붙은 뒤에 재고, 바뀌면 다시 잰다
  useLayoutEffect(() => {
    const el = rulerRef.current
    if (!el) return
    const measure = () =>
      setSize((prev) =>
        prev.w === el.clientWidth && prev.h === el.clientHeight
          ? prev
          : { w: el.clientWidth, h: el.clientHeight },
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 값이 바뀔 때마다 다시 그린다 (백여 개 선이라 손가락을 따라올 만큼 가볍다)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && active && size.w) drawRuler(canvas, size.w, size.h, active)
  })

  if (!active) return null

  const move = (next: number) => {
    const snapped = Math.abs(next - active.rest) < SNAP ? active.rest : next
    active.onChange(clamp(snapped, active.min, active.max))
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, value: active.value }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const from = drag.current
    if (!from) return
    // 눈금자를 왼쪽으로 밀면 오른쪽 값이 바늘 밑으로 온다
    move(from.value - (e.clientX - from.x) / active.pxPerUnit)
  }

  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  const press = (knob: DialKnob) => {
    // 이미 고른 걸 또 누르면 제자리로 — 눈금자로 0을 정확히 짚기는 어렵다
    if (knob.key === activeKey) knob.onChange(knob.rest)
    else setActiveKey(knob.key)
  }

  /* 값만큼 차오르는 부채꼴. 어느 손잡이를 건드려 놓았는지 눈금자를 안 봐도 안다. */
  const wedge = (knob: DialKnob): CSSProperties => {
    const span = Math.max(knob.max - knob.rest, knob.rest - knob.min) || 1
    const fraction = clamp((knob.value - knob.rest) / span, -1, 1)
    return {
      '--from': fraction < 0 ? fraction : 0,
      '--len': Math.abs(fraction),
    } as CSSProperties
  }

  return (
    <div className="dial">
      <div className="dial__knobs">
        {knobs.map((knob) => (
          <button
            key={knob.key}
            type="button"
            className="dial__knob"
            style={wedge(knob)}
            data-on={knob.key === activeKey || undefined}
            onClick={() => press(knob)}
            disabled={disabled}
            aria-pressed={knob.key === activeKey}
            aria-label={
              knob.key === activeKey
                ? `${knob.label} ${knob.format(knob.value)} — 눌러서 되돌리기`
                : knob.label
            }
            title={knob.label}
          >
            {/*
              만지는 동안, 그리고 만져놓은 값이 남아 있는 동안에는
              아이콘 자리에 값이 들어간다. 제자리로 돌아오면 다시 아이콘이다.
            */}
            {knob.key === activeKey && (dragging || knob.value !== knob.rest) ? (
              <span className="dial__reading">{knob.format(knob.value)}</span>
            ) : (
              knob.icon
            )}
          </button>
        ))}
      </div>

      <div
        className="dial__ruler"
        ref={rulerRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={active.label}
        aria-valuemin={active.min}
        aria-valuemax={active.max}
        aria-valuenow={Math.round(active.value)}
        aria-valuetext={active.format(active.value)}
        aria-disabled={disabled}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'ArrowLeft') move(active.value - active.tick)
          else if (e.key === 'ArrowRight') move(active.value + active.tick)
          else return
          e.preventDefault()
        }}
      >
        <canvas className="dial__canvas" ref={canvasRef} aria-hidden="true" />
        <span className="dial__needle" aria-hidden="true" />
      </div>
    </div>
  )
}
