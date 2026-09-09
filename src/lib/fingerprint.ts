/**
 * 사진 지문.
 *
 * 사진 한 장을 64비트로 요약해, 두 장이 같은 그림인지 빠르게 견준다.
 * 이미 가진 포카를 또 등록하는 걸 막고, 손에 든 카드가 보관함에 있는지
 * 찾아보는 데 쓴다.
 *
 * 방법은 흔히 dHash라 부르는 것이다 — 아주 작게(9×8) 줄여 흑백으로 바꾸고,
 * 옆 칸보다 밝은지 아닌지만 한 칸에 1비트씩 적는다. 밝기의 '차이'만 보므로
 * 사진이 전체적으로 밝아지거나, 크기가 달라지거나, 다시 저장하며 화질이
 * 떨어져도 지문은 거의 그대로다.
 *
 * 못 하는 일도 분명하다. 같은 멤버의 다른 사진이나 '분위기가 비슷한 것'은
 * 찾지 못한다. 그건 사진의 뜻을 읽는 모델이 있어야 하고, 그 모델은 이 앱
 * 전체(400KB)의 백 배쯤 된다. 여기서 푸는 건 '같은 그림인가'까지다.
 */

/* 9×8로 줄여 가로 이웃끼리 견주면 8×8 = 64비트가 나온다 */
const W = 9
const H = 8

/** 64비트를 16자리 16진수 문자열로 들고 다닌다 (IndexedDB에 넣기 쉽다) */
export type Fingerprint = string

export async function fingerprintOf(source: Blob): Promise<Fingerprint | null> {
  try {
    const bitmap = await createImageBitmap(source)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, W, H)
      const { data } = ctx.getImageData(0, 0, W, H)

      let bits = ''
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W - 1; x++) {
          const here = gray(data, y * W + x)
          const next = gray(data, y * W + x + 1)
          bits += here > next ? '1' : '0'
        }
      }
      // 4비트씩 묶어 16진수로
      let hex = ''
      for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
      return hex
    } finally {
      bitmap.close()
    }
  } catch {
    // 지문은 거들기다. 못 뽑아도 등록이나 검색이 막히면 안 된다.
    return null
  }
}

/** 사람 눈이 느끼는 밝기에 맞춘 가중치 */
function gray(data: Uint8ClampedArray, index: number) {
  const i = index * 4
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
}

/** 두 지문에서 다른 비트가 몇 개인지 (0이면 같은 그림) */
export function distance(a: Fingerprint, b: Fingerprint) {
  if (a.length !== b.length) return 64
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      diff += x & 1
      x >>= 1
    }
  }
  return diff
}

/*
 * 얼마나 닮아야 '같은 것'으로 볼지.
 *
 * 64비트 중 몇 개까지 달라도 같은 그림으로 치느냐다. 너무 좁히면 다시 저장해
 * 화질이 조금 떨어진 사진을 놓치고, 너무 넓히면 남남인 카드가 걸려 성가시다.
 * 흔히 쓰는 자리인 10 언저리에 두되, 등록을 막을 때는 더 확실할 때만 말한다.
 */
export const SAME = 6
export const SIMILAR = 12

export const looksSame = (a: Fingerprint, b: Fingerprint) => distance(a, b) <= SAME
