import { hasTilt, homographyOf, invert, type CropView } from './cropGeometry'

/**
 * 업로드된 이미지를 WebP로 변환한다.
 * - 원본 그대로 두면 카드 한 장에 수 MB가 잡히므로 긴 변을 기준으로 리사이즈한다.
 * - 그리드용 썸네일과 상세 팝업용 본체를 따로 만든다.
 */

/*
 * 상세 팝업에 실제로 보이는 폭은 300px 안팎이다. 고밀도 화면(3배)까지 감안해도
 * 900px이면 충분한데, 확대해 보거나 나중에 큰 화면에서 볼 여지를 남겨 1000px로 둔다.
 * (실물 카드 긴 변 86mm 기준으로 약 295dpi라 인쇄에도 모자라지 않는다)
 */
export const FULL_MAX_EDGE = 1000
export const FULL_QUALITY = 0.82
// 한 줄에 4장이라 그리드 칸이 100px 안팎 — 고해상도 화면까지 감안해 360px면 충분하다.
export const THUMB_MAX_EDGE = 360
export const THUMB_QUALITY = 0.72

export interface EncodedImage {
  blob: Blob
  width: number
  height: number
}

export interface ProcessedImage {
  full: EncodedImage
  thumb: EncodedImage
  /** 변환 전 원본 바이트 (절감량 표시에 사용) */
  originalBytes: number
}

let webpSupport: boolean | null = null

/** Safari 구버전 등 WebP 인코딩이 안 되는 환경을 감지 — 이 경우 JPEG로 떨어진다. */
export function canEncodeWebp(): boolean {
  if (webpSupport !== null) return webpSupport
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  return webpSupport
}

export const outputMime = () => (canEncodeWebp() ? 'image/webp' : 'image/jpeg')
export const outputExt = () => (canEncodeWebp() ? 'webp' : 'jpg')

function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  // EXIF 회전 정보를 반영해서 디코드한다 (아이폰 세로 사진 대응)
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return await createImageBitmap(file)
  }
}

/** 자른 결과는 캔버스로 나오므로, 원본 비트맵과 같은 자리에서 받아 쓴다. */
type EncodeSource = (ImageBitmap | HTMLCanvasElement) & { width: number; height: number }

/** 긴 변을 maxEdge에 맞춰 줄여 그린다. 값이 드는 건 이 그리기다. */
function shrink(source: EncodeSource, maxEdge: number): HTMLCanvasElement {
  const { width, height } = fitWithin(source.width, source.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function toEncoded(canvas: HTMLCanvasElement, quality: number): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('이미지 변환에 실패했습니다.'))
        resolve({ blob, width: canvas.width, height: canvas.height })
      },
      outputMime(),
      quality,
    )
  })
}

/** 저장해둔 본체 이미지를 다시 자를 때도 쓰므로 File이 아니라 Blob을 받는다. */
export async function processImage(file: Blob): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    const name = file instanceof File ? file.name : '알 수 없는 파일'
    throw new Error(`이미지 파일이 아닙니다: ${name}`)
  }
  const bitmap = await loadBitmap(file)
  try {
    const shrunk = shrink(bitmap, FULL_MAX_EDGE)
    /*
     * 썸네일은 원본이 아니라 방금 줄여둔 것에서 뽑는다.
     *
     * 둘 다 원본에서 그리면 4000×3000짜리를 두 번 훑는다 — 1200만 픽셀을
     * 읽는 일을 한 장에 두 번 하는 셈이다. 1000px로 줄여둔 것에서 뽑으면
     * 두 번째는 75만 픽셀만 읽으므로 그 대목이 16분의 1로 준다.
     *
     * 화질은 그대로다. 목표가 360px인데 1000px은 이미 세 배가 넘는 밑감이라,
     * 원본에서 바로 줄인 것과 눈으로 가릴 수 없다.
     */
    const full = await toEncoded(shrunk, FULL_QUALITY)
    const thumb = await toEncoded(shrink(shrunk, THUMB_MAX_EDGE), THUMB_QUALITY)
    return { full, thumb, originalBytes: file.size }
  } finally {
    bitmap.close()
  }
}

/*
 * 자르기 화면에 띄울 축소본.
 *
 * 폰 사진은 12MP(4000×3000)쯤 된다. 그걸 그대로 <img>에 물리면 화면에는
 * 230px로 보이면서 메모리와 래스터 비용은 원본 크기로 낸다. 자르기 화면은
 * 그 그림을 두 겹(틀 안·틀 밖)으로 깔기 때문에 값이 두 배로 든다.
 *
 * 화면에서 필요한 해상도는 아무리 크게 잡아도 1400px이면 남는다. 원본은
 * 마지막에 '이대로 자르기'를 누를 때 다시 읽어 쓰므로 화질은 손해가 없다.
 */
export interface PreviewImage {
  /** 화면에 붙일 축소본 주소 */
  url: string
  /** 원본 픽셀 크기 — 확대 상한을 정하는 데 쓴다 (축소본 크기로 재면 안 된다) */
  naturalWidth: number
  naturalHeight: number
  /** 같은 축소본의 비트맵. 카드 검출에 쓰고 나면 close()로 놓아준다. */
  bitmap: ImageBitmap
}

export async function makePreview(source: Blob, maxEdge: number): Promise<PreviewImage> {
  const full = await loadBitmap(source)
  const naturalWidth = full.width
  const naturalHeight = full.height
  const { width, height } = fitWithin(naturalWidth, naturalHeight, maxEdge)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    full.close()
    throw new Error('캔버스를 사용할 수 없습니다.')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(full, 0, 0, width, height)
  // 원본 비트맵은 여기서 놓아준다 — 수십 MB가 계속 잡혀 있을 이유가 없다
  full.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputMime(), 0.9),
  )
  if (!blob) throw new Error('이미지 변환에 실패했습니다.')

  return {
    url: URL.createObjectURL(blob),
    naturalWidth,
    naturalHeight,
    bitmap: await createImageBitmap(canvas),
  }
}

/*
 * 크롭 화면에서 사진을 어떻게 놓았는지를 그대로 옮긴 값.
 * 좌표는 전부 '화면 픽셀'이고, 원본 픽셀로의 환산은 base가 맡는다.
 */
export interface CropTransform {
  /** 화면에 그려진 틀의 크기 */
  frame: { w: number; h: number }
  /** scale이 1일 때 사진이 화면에서 차지하는 크기 (틀을 꽉 채우는 크기) */
  base: { w: number; h: number }
  view: CropView
}

/** 틀에 실제로 걸린 원본 픽셀 — 저장 해상도를 여기에 맞춘다 */
function croppedSourceEdge(t: CropTransform, naturalWidth: number) {
  return (t.frame.h / t.view.scale) * (naturalWidth / t.base.w)
}

function outputSize(t: CropTransform, naturalWidth: number) {
  const height = Math.max(
    1,
    Math.round(Math.min(FULL_MAX_EDGE, croppedSourceEdge(t, naturalWidth))),
  )
  return { width: Math.max(1, Math.round((height * t.frame.w) / t.frame.h)), height }
}

/**
 * 기울임이 없을 때. 화면에서 쓴 변환을 캔버스에 같은 순서로 되짚기만 하면 된다.
 * 브라우저가 직접 그리므로 축소 품질도 가장 좋다.
 */
function drawAffine(
  bitmap: ImageBitmap,
  t: CropTransform,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const f = width / t.frame.w
  ctx.translate(width / 2, height / 2)
  ctx.scale(f, f)
  ctx.translate(t.view.x, t.view.y)
  ctx.scale(t.view.scale, t.view.scale)
  ctx.rotate(t.view.rotation)
  ctx.drawImage(bitmap, -t.base.w / 2, -t.base.h / 2, t.base.w, t.base.h)
  return canvas
}

/*
 * 기울임이 있을 때.
 *
 * 캔버스 2D는 사다리꼴을 그릴 수 없다 — drawImage에 걸 수 있는 변환이
 * 평행선을 평행하게 유지하는 것까지라, 원근은 원리적으로 표현이 안 된다.
 * 그래서 반대로 간다: 결과의 픽셀마다 '이 자리는 원본의 어디에서 왔나'를
 * 역행렬로 되짚어 색을 떠 온다. 네 점을 섞어(이중선형) 뜨므로 계단이 지지 않는다.
 *
 * 원본을 통째로 펼치면 폰에서 수십 MB가 잡히므로, 결과에 필요한 만큼만
 * 미리 줄여 놓고 훑는다. 줄이는 일은 브라우저가 하니 그 단계의 품질은 좋다.
 */
function drawProjected(
  bitmap: ImageBitmap,
  t: CropTransform,
  width: number,
  height: number,
): HTMLCanvasElement {
  const h = invert(homographyOf(t.view, t.frame))
  if (!h) throw new Error('이 각도로는 자를 수 없습니다.')

  // 잘라낼 부분이 결과 크기와 얼추 1:1이 되게 원본을 줄여 둔다 (여유 1.4배)
  const edge = croppedSourceEdge(t, bitmap.width)
  const shrink = Math.min(1, edge ? (height * 1.4) / edge : 1)
  const workW = Math.max(2, Math.round(bitmap.width * shrink))
  const workH = Math.max(2, Math.round(bitmap.height * shrink))

  const work = document.createElement('canvas')
  work.width = workW
  work.height = workH
  const workCtx = work.getContext('2d', { willReadFrequently: true })
  if (!workCtx) throw new Error('캔버스를 사용할 수 없습니다.')
  workCtx.imageSmoothingEnabled = true
  workCtx.imageSmoothingQuality = 'high'
  workCtx.drawImage(bitmap, 0, 0, workW, workH)
  const src = workCtx.getImageData(0, 0, workW, workH).data

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.')
  const out = ctx.createImageData(width, height)
  const dst = out.data

  // 화면 좌표 → 원본 픽셀로 옮기는 데 쓰는 상수들
  const perX = workW / t.base.w
  const perY = workH / t.base.h
  const halfW = t.base.w / 2
  const halfH = t.base.h / 2

  for (let oy = 0; oy < height; oy++) {
    const fy = ((oy + 0.5) / height) * t.frame.h - t.frame.h / 2
    for (let ox = 0; ox < width; ox++) {
      const fx = ((ox + 0.5) / width) * t.frame.w - t.frame.w / 2

      const w = h[6] * fx + h[7] * fy + h[8]
      const px = (h[0] * fx + h[1] * fy + h[2]) / w
      const py = (h[3] * fx + h[4] * fy + h[5]) / w

      // 원본 픽셀 좌표 (가장자리 밖은 가장자리 색으로 — 덮개 검사 덕에 거의 안 걸린다)
      let sx = (px + halfW) * perX - 0.5
      let sy = (py + halfH) * perY - 0.5
      sx = sx < 0 ? 0 : sx > workW - 1 ? workW - 1 : sx
      sy = sy < 0 ? 0 : sy > workH - 1 ? workH - 1 : sy

      const x0 = sx | 0
      const y0 = sy | 0
      const x1 = x0 + 1 < workW ? x0 + 1 : x0
      const y1 = y0 + 1 < workH ? y0 + 1 : y0
      const tx = sx - x0
      const ty = sy - y0

      const i00 = (y0 * workW + x0) * 4
      const i10 = (y0 * workW + x1) * 4
      const i01 = (y1 * workW + x0) * 4
      const i11 = (y1 * workW + x1) * 4
      const w00 = (1 - tx) * (1 - ty)
      const w10 = tx * (1 - ty)
      const w01 = (1 - tx) * ty
      const w11 = tx * ty

      const o = (oy * width + ox) * 4
      for (let c = 0; c < 3; c++) {
        dst[o + c] =
          src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11
      }
      dst[o + 3] = 255
    }
  }

  ctx.putImageData(out, 0, 0)
  return canvas
}

/**
 * 자른 조각만 남겨 카드 한 장을 만든다.
 *
 * 해상도는 '틀에 실제로 걸린 원본 픽셀'과 FULL_MAX_EDGE 중 작은 쪽으로 잡는다.
 * 크게 확대해 자른 사진을 1000px로 늘려봐야 없는 화질이 생기지 않고,
 * 용량만 커지기 때문이다.
 */
export async function processCroppedImage(
  source: Blob,
  t: CropTransform,
): Promise<ProcessedImage> {
  const bitmap = await loadBitmap(source)
  try {
    const { width, height } = outputSize(t, bitmap.width)
    const canvas = hasTilt(t.view)
      ? drawProjected(bitmap, t, width, height)
      : drawAffine(bitmap, t, width, height)

    // 자른 판은 이미 목표 크기라 그대로 굽고, 썸네일만 여기서 한 번 더 줄인다
    const full = await toEncoded(canvas, FULL_QUALITY)
    const thumb = await toEncoded(shrink(canvas, THUMB_MAX_EDGE), THUMB_QUALITY)
    return { full, thumb, originalBytes: source.size }
  } finally {
    bitmap.close()
  }
}

/** 확장자로 타입을 짐작한다. 서버가 octet-stream으로 내려주는 경우가 있다. */
const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
}

/**
 * 인터넷 주소에서 이미지를 받아 File로 만든다.
 * 받은 뒤에는 파일로 올린 것과 똑같이 WebP로 변환해 기기에 저장하므로,
 * 나중에 원본 주소가 사라져도 카드는 그대로 남는다.
 */
export async function fetchImageAsFile(input: string): Promise<File> {
  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    throw new Error(`주소 형식이 아닙니다: ${input}`)
  }
  if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
    throw new Error('http(s) 주소만 가져올 수 있습니다.')
  }

  let response: Response
  try {
    // 브라우저에서 남의 사이트 이미지를 직접 받으려면 그쪽이 CORS를 열어둬야 한다.
    response = await fetch(input, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new Error(
      '이미지를 가져오지 못했습니다. 그 사이트가 외부에서 이미지를 가져가는 것을 막고 있을 수 있어요. 사진을 저장한 뒤 파일로 올려 주세요.',
    )
  }
  if (!response.ok) {
    throw new Error(`이미지를 가져오지 못했습니다 (HTTP ${response.status}).`)
  }

  const blob = await response.blob()
  const name = decodeURIComponent(parsed.pathname.split('/').pop() || '') || 'image'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const type = blob.type.startsWith('image/') ? blob.type : EXT_MIME[ext]
  if (!type) throw new Error('이미지 주소가 아닌 것 같습니다.')

  return new File([blob], name, { type })
}
