/**
 * 자르기 화면의 변환을 한곳에서 정의한다.
 *
 * 미리보기는 CSS가 그리고 결과는 캔버스가 그리는데, 둘이 조금이라도 다르면
 * "보이는 대로 저장된다"는 약속이 깨진다. 그래서 CSS가 만드는 4×4 행렬을
 * 여기서 그대로 세우고, 화면에는 같은 순서의 transform 문자열을 내주고,
 * 저장에는 그 행렬에서 뽑은 3×3을 내준다. 한 군데서 나온 값이라 어긋날 수 없다.
 *
 * 변환 순서 (오른쪽이 먼저 적용된다):
 *   이동 → 확대 → 원근 → 상하기울임 → 좌우기울임 → 회전
 *
 * 확대를 원근보다 바깥에 둔 건 일부러다. 안쪽에 두면 크게 확대할수록 사진이
 * 눈앞으로 다가와, 기울임이 같은 각도인데도 사다리꼴이 점점 심해진다.
 * 게다가 많이 확대하면 사진 끝이 시점 뒤로 넘어가 그림이 접힌다.
 * 바깥에 두면 원근은 늘 원래 크기의 사진에 걸리고, 그 결과를 키우기만 한다.
 */

export interface CropView {
  scale: number
  /** 화면 안에서 도는 각도 (라디안) */
  rotation: number
  /** 위아래로 눕히기 — 윗변이 뒤로 넘어간다 (라디안) */
  tiltX: number
  /** 좌우로 눕히기 (라디안) */
  tiltY: number
  x: number
  y: number
}

export interface Size {
  w: number
  h: number
}

export const IDENTITY_VIEW: CropView = { scale: 1, rotation: 0, tiltX: 0, tiltY: 0, x: 0, y: 0 }

/**
 * 시점까지의 거리. 짧을수록 기울임이 과장된다.
 *
 * 틀 높이에 매달아 두면 화면이 크든 작든 같은 각도에서 같은 모양이 나온다.
 */
export const perspectiveOf = (frame: Size) => Math.max(320, frame.h * 2.5)

export const hasTilt = (v: CropView) => v.tiltX !== 0 || v.tiltY !== 0

type Mat4 = Float64Array<ArrayBuffer>

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[r * 4 + k] * b[k * 4 + c]
      out[r * 4 + c] = sum
    }
  }
  return out
}

const mat = (...v: number[]) => Float64Array.from(v)

/* CSS의 각 transform 함수에 해당하는 행렬들 (열벡터 규약, y는 아래로 증가) */
const translate = (x: number, y: number) =>
  mat(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, 0, 0, 0, 0, 1)
const scaleM = (s: number) => mat(s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
const perspectiveM = (d: number) =>
  mat(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1 / d, 1)
const rotateX = (a: number) =>
  mat(1, 0, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, 0, Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1)
const rotateY = (a: number) =>
  mat(Math.cos(a), 0, Math.sin(a), 0, 0, 1, 0, 0, -Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1)
const rotateZ = (a: number) =>
  mat(Math.cos(a), -Math.sin(a), 0, 0, Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)

/**
 * 사진의 한 점(중심 기준)을 화면 좌표(틀 중심 기준)로 보내는 3×3.
 *
 * 사진은 z=0 평면에 있으므로 4×4에서 z 열은 쓰이지 않는다. 남는 여덟 칸과
 * 마지막 행이 곧 사영 변환이다 — 마지막 행이 있어서 사다리꼴이 나온다.
 */
export type Homography = Float64Array<ArrayBuffer>

export function homographyOf(view: CropView, frame: Size): Homography {
  const d = perspectiveOf(frame)
  const m = [
    translate(view.x, view.y),
    scaleM(view.scale),
    perspectiveM(d),
    rotateX(view.tiltX),
    rotateY(view.tiltY),
    rotateZ(view.rotation),
  ].reduce(multiply)

  // 행 0·1·3에서 열 0·1·3만 추린다
  return Float64Array.from([m[0], m[1], m[3], m[4], m[5], m[7], m[12], m[13], m[15]])
}

/** 화면에 그대로 물릴 CSS 변환. 앞의 -50%는 요소를 제 중심에 앉히는 몫이다. */
export function toCssTransform(view: CropView, frame: Size) {
  const d = perspectiveOf(frame)
  return (
    `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) ` +
    `scale(${view.scale}) perspective(${d}px) ` +
    `rotateX(${view.tiltX}rad) rotateY(${view.tiltY}rad) rotate(${view.rotation}rad)`
  )
}

/** (x, y) → 변환된 화면 좌표. w로 나누는 이 한 줄이 원근의 전부다. */
export function project(h: Homography, x: number, y: number): [number, number] {
  const w = h[6] * x + h[7] * y + h[8]
  const safe = Math.abs(w) < 1e-9 ? 1e-9 : w
  return [(h[0] * x + h[1] * y + h[2]) / safe, (h[3] * x + h[4] * y + h[5]) / safe]
}

export function invert(h: Homography): Homography | null {
  const [a, b, c, d, e, f, g, i, j] = h
  const A = e * j - f * i
  const B = f * g - d * j
  const C = d * i - e * g
  const det = a * A + b * B + c * C
  if (!det || !Number.isFinite(det)) return null
  return Float64Array.from([
    A / det,
    (c * i - b * j) / det,
    (b * f - c * e) / det,
    B / det,
    (a * j - c * g) / det,
    (c * d - a * f) / det,
    C / det,
    (b * g - a * i) / det,
    (a * e - b * d) / det,
  ])
}

/** 사진 네 귀퉁이가 화면 어디에 찍히는지 (왼위 → 오른위 → 오른아래 → 왼아래) */
export function projectedCorners(view: CropView, frame: Size, base: Size) {
  const h = homographyOf(view, frame)
  const hw = base.w / 2
  const hh = base.h / 2
  return [
    project(h, -hw, -hh),
    project(h, hw, -hh),
    project(h, hw, hh),
    project(h, -hw, hh),
  ]
}

/**
 * 틀이 사진 안에 온전히 들어와 있는지.
 *
 * 사영된 사각형은 (시점 뒤로 넘어가지 않는 한) 볼록하므로, 네 변을 도는 동안
 * 점이 늘 같은 쪽에 있으면 안쪽이다.
 */
export function covers(view: CropView, frame: Size, base: Size) {
  if (!base.w || !base.h) return true
  const quad = projectedCorners(view, frame, base)
  const corners: Array<[number, number]> = [
    [-frame.w / 2, -frame.h / 2],
    [frame.w / 2, -frame.h / 2],
    [frame.w / 2, frame.h / 2],
    [-frame.w / 2, frame.h / 2],
  ]
  for (const [px, py] of corners) {
    let sign = 0
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = quad[i]
      const [bx, by] = quad[(i + 1) % 4]
      const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
      if (Math.abs(cross) < 1e-9) continue
      const next = cross > 0 ? 1 : -1
      if (sign && next !== sign) return false
      sign = next
    }
  }
  return true
}
