/** 멤버(=탭/서랍에서 고를 대상). RIIZE로 시드되지만 '+'로 자유롭게 추가/수정 가능. */
export interface Member {
  id: string
  name: string
  /** 칩·뱃지에 쓰이는 대표 색 (hex) */
  color: string
  /** 탭 정렬 순서 */
  order: number
  createdAt: number
}

/** 카테고리 = 앨범/버전/이벤트 등 업로드 시 고르는 분류. */
export interface Category {
  id: string
  name: string
  order: number
  createdAt: number
}

export type CardStatus = 'own' | 'traded' | 'sold'

/**
 * 사진 지문. 같은 그림인지 견주는 데 쓴다.
 *
 * 카드 행에 붙이지 않고 따로 둔 건, 중복을 찾을 때 카드를 전부 읽으면
 * 행마다 딸린 썸네일까지 끌려오기 때문이다. 여기는 한 줄에 열여섯 글자뿐이라
 * 수천 장이어도 통째로 읽는 값이 없다시피 하다.
 */
export interface StoredPrint {
  cardId: string
  /** 64비트를 16진수 열여섯 자리로 */
  fp: string
}

/** 상세 팝업에서만 읽어오는 본체 이미지. */
export interface StoredImage {
  cardId: string
  blob: Blob
}

export interface Card {
  id: string
  /** 제목 = 상세 팝업에서 보여줄 이름 */
  title: string
  memberId: string
  categoryId: string | null
  memo: string
  /**
   * 그리드용 소형 WebP. 본체(큰 이미지)는 images 테이블에 따로 두어
   * 목록을 조회할 때 원본까지 메모리에 올라오지 않게 한다.
   */
  thumb: Blob
  width: number
  height: number
  /** WebP 변환 후 바이트 수 */
  bytes: number
  favorite: 0 | 1
  /** Dexie는 boolean을 인덱싱하지 못하므로 0/1로 둔다 */
  deleted: 0 | 1
  deletedAt: number | null
  /** 휴지통으로 보낸 사유 (양도/판매 기록용) */
  status: CardStatus
  createdAt: number
  updatedAt: number
}

/** ZIP 백업 안의 manifest.json 구조 (Blob은 별도 파일로 나간다) */
export interface BackupManifest {
  format: 'poca-archive'
  version: 1
  exportedAt: number
  members: Member[]
  categories: Category[]
  cards: Array<Omit<Card, 'thumb'> & { imageFile: string; thumbFile: string }>
}
