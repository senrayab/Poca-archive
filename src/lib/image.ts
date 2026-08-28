/**
 * 업로드된 이미지를 WebP로 변환한다.
 * - 원본 그대로 두면 카드 한 장에 수 MB가 잡히므로 긴 변을 기준으로 리사이즈한다.
 * - 그리드용 썸네일과 상세 팝업용 본체를 따로 만든다.
 */

export const FULL_MAX_EDGE = 1600
export const FULL_QUALITY = 0.82
// 한 줄에 4장이라 그리드 칸이 100px 안팎 — 고해상도 화면까지 감안해 360px면 충분하다.
export const THUMB_MAX_EDGE = 420
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

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // EXIF 회전 정보를 반영해서 디코드한다 (아이폰 세로 사진 대응)
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return await createImageBitmap(file)
  }
}

function encode(
  source: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<EncodedImage> {
  const { width, height } = fitWithin(source.width, source.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('캔버스를 사용할 수 없습니다.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('이미지 변환에 실패했습니다.'))
        resolve({ blob, width, height })
      },
      outputMime(),
      quality,
    )
  })
}

export async function processImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`이미지 파일이 아닙니다: ${file.name}`)
  }
  const bitmap = await loadBitmap(file)
  try {
    const full = await encode(bitmap, FULL_MAX_EDGE, FULL_QUALITY)
    const thumb = await encode(bitmap, THUMB_MAX_EDGE, THUMB_QUALITY)
    return { full, thumb, originalBytes: file.size }
  } finally {
    bitmap.close()
  }
}
