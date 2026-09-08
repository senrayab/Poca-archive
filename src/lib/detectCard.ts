/**
 * 사진 속에서 카드로 보이는 사각형을 찾는다.
 *
 * 자르기 화면이 열릴 때 틀 위치를 미리 맞춰두는 용도다. 찾지 못하면 null을
 * 돌려주고, 그때는 지금까지처럼 사진 전체에서 시작한다 — 틀리게 잡느니
 * 아무것도 안 하는 쪽이 낫기 때문에 의심스러우면 전부 버린다.
 *
 * 방법은 '책상 위에 놓인 카드를 찍었다'는 흔한 경우에 맞췄다.
 *   테두리 색으로 배경을 짐작 → 배경과 다른 픽셀만 남기기(Otsu) →
 *   가장 큰 덩어리 → 볼록 껍질 → 그 껍질에 가장 꼭 맞는 (기울어진) 사각형
 *
 * OpenCV 같은 걸 들이지 않은 건 wasm이 8MB가 넘어서다. 이 앱 전체가 400KB인데
 * 오프라인으로 쓰라고 만든 PWA에 그걸 미리 받아두게 할 수는 없다.
 * 여기 있는 건 전부 순수 계산이라 의존성이 늘지 않는다.
 */

export interface DetectedCard {
  /** 원본 픽셀 기준 중심 */
  cx: number
  cy: number
  /** 원본 픽셀 기준 가로(짧은 변)·세로(긴 변) */
  w: number
  h: number
  /** 카드를 세우려면 사진을 얼마나 돌려야 하는지 (라디안) */
  rotation: number
}

/* 긴 변을 이만큼으로 줄여놓고 본다. 잡티가 사라지고, 계산도 40배쯤 가벼워진다. */
const WORK_EDGE = 256
/* 실물 카드는 86/54 = 1.593. 원근 때문에 조금씩 어긋나니 폭을 준다. */
const MIN_RATIO = 1.3
const MAX_RATIO = 1.95
/* 크롭 화면의 기울기 슬라이더가 ±15도라, 그 밖은 표현할 방법이 없다 */
const MAX_TILT = (15 * Math.PI) / 180
/* 너무 작으면 카드가 아니라 무늬고, 96%를 넘으면 이미 카드 사진이라 자를 게 없다 */
const MIN_AREA = 0.05
const MAX_AREA = 0.96
/* 찾은 덩어리가 그 사각형을 이만큼은 채워야 한다 (L자로 번진 그림자 걸러내기) */
const MIN_FILL = 0.72
/* 배경색과 이 정도도 차이 나지 않으면 경계로 치지 않는다 */
const MIN_THRESHOLD = 14

interface Work {
  data: Uint8ClampedArray
  w: number
  h: number
}

function toWorkImage(source: CanvasImageSource, nw: number, nh: number): Work | null {
  const fit = Math.min(1, WORK_EDGE / Math.max(nw, nh))
  const w = Math.max(8, Math.round(nw * fit))
  const h = Math.max(8, Math.round(nh * fit))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, w, h)
  return { data: ctx.getImageData(0, 0, w, h).data, w, h }
}

/** 테두리 띠의 중앙값을 배경색으로 삼는다. 평균이 아니라 중앙값이라 한쪽 구석이 튀어도 흔들리지 않는다. */
function borderColor({ data, w, h }: Work): [number, number, number] {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.04))
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  for (let y = 0; y < h; y++) {
    const edgeRow = y < band || y >= h - band
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x >= band && x < w - band) {
        x = w - band - 1
        continue
      }
      const i = (y * w + x) * 4
      rs.push(data[i])
      gs.push(data[i + 1])
      bs.push(data[i + 2])
    }
  }
  const mid = (a: number[]) => {
    a.sort((p, q) => p - q)
    return a[a.length >> 1] ?? 0
  }
  return [mid(rs), mid(gs), mid(bs)]
}

/** 임계값을 그림에서 직접 뽑는다 (Otsu) — 밝은 배경이든 어두운 배경이든 같은 코드로 갈린다. */
function otsuThreshold(hist: Int32Array, total: number) {
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let countB = 0
  let best = 0
  let bestVariance = -1
  for (let i = 0; i < 256; i++) {
    countB += hist[i]
    if (!countB) continue
    const countF = total - countB
    if (!countF) break
    sumB += i * hist[i]
    const meanB = sumB / countB
    const meanF = (sum - sumB) / countF
    const variance = countB * countF * (meanB - meanF) * (meanB - meanF)
    if (variance > bestVariance) {
      bestVariance = variance
      best = i
    }
  }
  return best
}

/** 위아래 좌우 한 칸씩 부풀리거나 깎는다. 붙여서 쓰면(부풀린 뒤 깎기) 끊어진 테두리가 이어진다. */
function morph(mask: Uint8Array, w: number, h: number, grow: boolean) {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      let value = mask[p]
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        // 바깥은 배경으로 친다 (깎을 때 테두리가 스스로 벗겨지도록)
        const n = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : mask[ny * w + nx]
        value = grow ? Math.max(value, n) : Math.min(value, n)
      }
      out[p] = value
    }
  }
  return out
}

/** 가장 큰 덩어리만 남기고, 그 덩어리의 테두리 점들을 돌려준다. */
function largestBlob(mask: Uint8Array, w: number, h: number) {
  const label = new Int32Array(mask.length).fill(-1)
  const stack = new Int32Array(mask.length)
  let bestLabel = -1
  let bestCount = 0
  let next = 0

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start] >= 0) continue
    const id = next++
    let top = 0
    let count = 0
    stack[top++] = start
    label[start] = id
    while (top > 0) {
      const p = stack[--top]
      count++
      const x = p % w
      const y = (p - x) / w
      if (x > 0 && mask[p - 1] && label[p - 1] < 0) label[(stack[top++] = p - 1)] = id
      if (x < w - 1 && mask[p + 1] && label[p + 1] < 0) label[(stack[top++] = p + 1)] = id
      if (y > 0 && mask[p - w] && label[p - w] < 0) label[(stack[top++] = p - w)] = id
      if (y < h - 1 && mask[p + w] && label[p + w] < 0) label[(stack[top++] = p + w)] = id
    }
    if (count > bestCount) {
      bestCount = count
      bestLabel = id
    }
  }
  if (bestLabel < 0) return null

  /*
   * 껍질을 씌우는 데는 테두리 점이면 충분하다. 속을 채운 점까지 넘기면
   * 몇 만 개가 되는데 결과는 한 톨도 달라지지 않는다.
   */
  const points: Array<[number, number]> = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (label[p] !== bestLabel) continue
      const inside =
        x > 0 && y > 0 && x < w - 1 && y < h - 1 &&
        label[p - 1] === bestLabel &&
        label[p + 1] === bestLabel &&
        label[p - w] === bestLabel &&
        label[p + w] === bestLabel
      if (!inside) points.push([x, y])
    }
  }
  return { points, count: bestCount }
}

/** 볼록 껍질 (모노톤 체인). 오목한 자국은 지워지므로 그림자 한 귀퉁이에 흔들리지 않는다. */
function convexHull(points: Array<[number, number]>) {
  if (points.length < 3) return points
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const build = (list: Array<[number, number]>) => {
    const out: Array<[number, number]> = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...build(sorted), ...build([...sorted].reverse())]
}

/**
 * 껍질에 가장 꼭 맞는 사각형. 최소 넓이 사각형은 반드시 껍질의 변 하나와
 * 나란하므로, 변마다 그 방향으로 재보고 제일 작은 것을 고르면 된다.
 */
function minAreaRect(hull: Array<[number, number]>) {
  let best: { angle: number; cx: number; cy: number; wu: number; wv: number } | null = null
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]
    const b = hull[(i + 1) % hull.length]
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    let minU = Infinity
    let maxU = -Infinity
    let minV = Infinity
    let maxV = -Infinity
    for (const [x, y] of hull) {
      const u = x * cos + y * sin
      const v = -x * sin + y * cos
      if (u < minU) minU = u
      if (u > maxU) maxU = u
      if (v < minV) minV = v
      if (v > maxV) maxV = v
    }
    const wu = maxU - minU
    const wv = maxV - minV
    if (best && wu * wv >= best.wu * best.wv) continue
    // 중심은 (u, v) 좌표에서 구해 다시 화면 좌표로 되돌린다
    const cu = (minU + maxU) / 2
    const cv = (minV + maxV) / 2
    best = { angle, wu, wv, cx: cu * cos - cv * sin, cy: cu * sin + cv * cos }
  }
  return best
}

/** 각도를 (-90°, 90°]로 접는다. 사각형은 180도 돌려도 같은 사각형이다. */
function foldAngle(angle: number) {
  let a = angle
  while (a > Math.PI / 2) a -= Math.PI
  while (a <= -Math.PI / 2) a += Math.PI
  return a
}

export function detectCard(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
): DetectedCard | null {
  const work = toWorkImage(source, naturalWidth, naturalHeight)
  if (!work) return null
  const { w, h } = work
  const total = w * h

  const bg = borderColor(work)
  const distance = new Uint8Array(total)
  const hist = new Int32Array(256)
  for (let p = 0; p < total; p++) {
    const i = p * 4
    const d = Math.min(
      255,
      Math.round(
        (Math.abs(work.data[i] - bg[0]) +
          Math.abs(work.data[i + 1] - bg[1]) +
          Math.abs(work.data[i + 2] - bg[2])) /
          3,
      ),
    )
    distance[p] = d
    hist[d]++
  }

  const threshold = Math.max(MIN_THRESHOLD, otsuThreshold(hist, total))
  let mask = new Uint8Array(total)
  for (let p = 0; p < total; p++) mask[p] = distance[p] > threshold ? 1 : 0

  // 부풀렸다 깎기 — 카드 테두리가 배경과 비슷해 한두 칸 끊긴 경우를 이어붙인다
  mask = morph(morph(mask, w, h, true), w, h, false)

  const blob = largestBlob(mask, w, h)
  if (!blob || blob.count < total * MIN_AREA) return null

  const hull = convexHull(blob.points)
  if (hull.length < 3) return null
  const rect = minAreaRect(hull)
  if (!rect) return null

  // 긴 변이 세로가 되도록 축을 정리한다 (가로로 누운 카드는 아래 기울기 검사에서 걸린다)
  const portrait = rect.wv >= rect.wu
  const width = portrait ? rect.wu : rect.wv
  const height = portrait ? rect.wv : rect.wu
  const tilt = foldAngle(-(portrait ? rect.angle : rect.angle + Math.PI / 2))

  if (!width || !height) return null
  if (Math.abs(tilt) > MAX_TILT) return null
  const ratio = height / width
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return null
  const area = (width * height) / total
  if (area < MIN_AREA || area > MAX_AREA) return null
  if (blob.count / (width * height) < MIN_FILL) return null

  const back = naturalWidth / w
  return {
    cx: rect.cx * back,
    cy: rect.cy * back,
    w: width * back,
    h: height * back,
    rotation: tilt,
  }
}
