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
