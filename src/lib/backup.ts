import { unzip, zip, type Unzipped, type Zippable } from 'fflate'
import { db } from '@/db/db'
import type { BackupManifest, Card } from '@/db/types'
import { outputExt } from './image'

const enc = new TextEncoder()
const dec = new TextDecoder()

const zipAsync = (data: Zippable) =>
  new Promise<Uint8Array>((resolve, reject) =>
    // 이미 WebP/JPEG로 압축된 바이너리라 level 0(저장)이 가장 빠르고 결과도 같다.
    zip(data, { level: 0 }, (err, out) => (err ? reject(err) : resolve(out))),
  )

const unzipAsync = (data: Uint8Array) =>
  new Promise<Unzipped>((resolve, reject) =>
    unzip(data, (err, out) => (err ? reject(err) : resolve(out))),
  )

const toBytes = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer())

/** 전체 아카이브를 ZIP 한 덩어리로 내보낸다. 휴지통 항목도 함께 담긴다. */
export async function exportArchive(): Promise<Blob> {
  const [members, categories, cards] = await Promise.all([
    db.members.orderBy('order').toArray(),
    db.categories.orderBy('order').toArray(),
    db.cards.toArray(),
  ])

  const ext = outputExt()
  const files: Zippable = {}
  const manifestCards: BackupManifest['cards'] = []

  for (const card of cards) {
    const stored = await db.images.get(card.id)
    if (!stored) continue // 본체가 사라진 카드는 백업에서 제외
    const imageFile = `images/${card.id}.${ext}`
    const thumbFile = `thumbs/${card.id}.${ext}`
    files[imageFile] = await toBytes(stored.blob)
    files[thumbFile] = await toBytes(card.thumb)
    const meta = { ...card } as Partial<Card>
    delete meta.thumb
    manifestCards.push({
      ...(meta as Omit<Card, 'thumb'>),
      imageFile,
      thumbFile,
    })
  }

  const manifest: BackupManifest = {
    format: 'poca-archive',
    version: 1,
    exportedAt: Date.now(),
    members,
    categories,
    cards: manifestCards,
  }
  files['manifest.json'] = enc.encode(JSON.stringify(manifest, null, 2))

  const out = await zipAsync(files)
  // Uint8Array 뷰를 그대로 넘기면 일부 브라우저에서 버퍼 전체가 실린다.
  return new Blob([out.slice()], { type: 'application/zip' })
}

export interface ImportResult {
  members: number
  categories: number
  cards: number
  skipped: number
}

/**
 * 백업 ZIP을 되돌린다. 같은 id가 이미 있으면 건너뛰므로
 * 여러 기기의 백업을 이어붙여도 중복이 생기지 않는다.
 */
export async function importArchive(file: File): Promise<ImportResult> {
  const entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
  const raw = entries['manifest.json']
  if (!raw) throw new Error('manifest.json이 없습니다. 이 앱에서 내보낸 백업이 맞나요?')

  const manifest = JSON.parse(dec.decode(raw)) as BackupManifest
  if (manifest.format !== 'poca-archive') {
    throw new Error('지원하지 않는 백업 형식입니다.')
  }

  const result: ImportResult = { members: 0, categories: 0, cards: 0, skipped: 0 }

  const existingMembers = new Set(await db.members.toCollection().primaryKeys())
  const memberNames = new Map(
    (await db.members.toArray()).map((m) => [m.name, m.id] as const),
  )
  const existingCategories = new Set(await db.categories.toCollection().primaryKeys())
  const existingCards = new Set(await db.cards.toCollection().primaryKeys())

  /** 백업의 멤버 id → 현재 DB의 멤버 id. 이름이 같으면 기존 멤버로 합친다. */
  const memberMap = new Map<string, string>()

  for (const member of manifest.members) {
    if (existingMembers.has(member.id)) {
      memberMap.set(member.id, member.id)
      continue
    }
    const sameName = memberNames.get(member.name)
    if (sameName) {
      memberMap.set(member.id, sameName)
      continue
    }
    await db.members.add(member)
    memberMap.set(member.id, member.id)
    memberNames.set(member.name, member.id)
    result.members++
  }

  for (const category of manifest.categories) {
    if (existingCategories.has(category.id)) continue
    await db.categories.add(category)
    result.categories++
  }

  for (const entry of manifest.cards) {
    if (existingCards.has(entry.id)) {
      result.skipped++
      continue
    }
    const imageBytes = entries[entry.imageFile]
    const thumbBytes = entries[entry.thumbFile]
    if (!imageBytes || !thumbBytes) {
      result.skipped++
      continue
    }
    const mime = entry.imageFile.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    const rest = { ...entry } as Partial<BackupManifest['cards'][number]>
    delete rest.imageFile
    delete rest.thumbFile
    const card: Card = {
      ...(rest as Omit<Card, 'thumb'>),
      memberId: memberMap.get(entry.memberId) ?? entry.memberId,
      thumb: new Blob([thumbBytes.slice()], { type: mime }),
    }
    await db.transaction('rw', db.cards, db.images, async () => {
      await db.cards.add(card)
      await db.images.put({
        cardId: card.id,
        blob: new Blob([imageBytes.slice()], { type: mime }),
      })
    })
    result.cards++
  }

  return result
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoke가 너무 빠르면 일부 브라우저에서 저장이 취소된다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const backupFilename = (at = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `poca-backup-${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}.zip`
}

/** 마지막 백업 시각 기록 — 설정 화면에서 '백업한 지 N일' 안내에 쓴다. */
const LAST_BACKUP_KEY = 'poca:lastBackupAt'
export const getLastBackupAt = () => {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? Number(raw) : null
}
export const markBackedUp = () =>
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
