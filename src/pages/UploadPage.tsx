import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/AppShell'
import { CameraCapture, canUseCamera } from '@/components/CameraCapture'
import { CropEditor } from '@/components/CropEditor'
import { CameraIcon, CloseIcon, CropIcon, ImageIcon, LinkIcon, PlusIcon } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { db, uid } from '@/db/db'
import type { Card, StoredImage } from '@/db/types'
import { useCategories, useMembers } from '@/hooks/useData'
import { formatBytes } from '@/lib/format'
import {
  canEncodeWebp,
  fetchImageAsFile,
  processImage,
  type ProcessedImage,
} from '@/lib/image'
import { takePendingFiles } from '@/lib/pendingFiles'

interface QueueItem {
  key: string
  title: string
  /** 항목별로 멤버·분류를 다르게 줄 수 있게 (빈 값이면 상단에서 고른 값을 쓴다) */
  memberId: string
  categoryId: string
  previewUrl: string
  processed: ProcessedImage
  /*
   * 변환 전 원본을 그대로 들고 있는다. 자르기는 여기서 다시 시작해야
   * 화질이 온전하다 — 1000px로 줄여둔 변환본을 또 자르면 손실이 겹친다.
   * File은 디스크를 가리키는 참조라 여러 장을 들고 있어도 메모리를 먹지 않는다.
   */
  file: File
  /** 한 번이라도 잘랐는지 (표시용) */
  cropped: boolean
}

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '')

export function UploadPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const members = useMembers()
  const categories = useCategories()

  const [memberId, setMemberId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [items, setItems] = useState<QueueItem[]>([])
  const [busy, setBusy] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [saving, setSaving] = useState(false)
  /** 자르기 중인 항목 (한 번에 하나) */
  const [cropKey, setCropKey] = useState<string | null>(null)
  const [shooting, setShooting] = useState(false)
  /* 앱 안에서 카메라를 켤 수 있는지는 한 번만 물어본다 (HTTPS가 아니면 못 켠다) */
  const [inAppCamera] = useState(canUseCamera)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // 멤버 목록이 로드되면 첫 멤버를 기본값으로
  useEffect(() => {
    if (!memberId && members.length) setMemberId(members[0].id)
  }, [members, memberId])

  /** 파일 하나를 변환해 대기 목록에 넣는다. 파일 선택과 주소 가져오기가 공유한다. */
  const enqueue = async (file: File) => {
    const processed = await processImage(file)
    setItems((prev) => [
      ...prev,
      {
        key: uid(),
        title: stripExtension(file.name),
        memberId: '',
        categoryId: '',
        previewUrl: URL.createObjectURL(processed.thumb.blob),
        processed,
        file,
        cropped: false,
      },
    ])
  }

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) {
      if (files.length) toast('이미지 파일만 등록할 수 있어요.')
      return
    }
    setBusy((n) => n + images.length)
    for (const file of images) {
      try {
        await enqueue(file)
      } catch (error) {
        toast(error instanceof Error ? error.message : '이미지를 처리하지 못했습니다.')
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  /*
   * 인터넷 주소로 등록. 받은 이미지도 파일과 똑같이 WebP로 변환해 기기에 넣으므로,
   * 나중에 원본이 사라져도 카드는 그대로 남는다.
   */
  const addUrls = async (raw: string) => {
    const urls = raw.split(/\s+/).filter(Boolean)
    if (!urls.length) return

    setBusy((n) => n + urls.length)
    let failed = 0
    for (const url of urls) {
      try {
        await enqueue(await fetchImageAsFile(url))
      } catch (error) {
        failed += 1
        toast(error instanceof Error ? error.message : '이미지를 가져오지 못했습니다.')
      } finally {
        setBusy((n) => n - 1)
      }
    }
    // 하나라도 성공했으면 입력창을 비운다 (전부 실패하면 고칠 수 있게 남겨둔다)
    if (failed < urls.length) setLinkInput('')
  }

  // FAB에서 이미 파일을 고른 채로 넘어온 경우
  useEffect(() => {
    const pending = takePendingFiles()
    if (pending.length) void addFiles(pending)
  }, [])

  // 언마운트 시점에는 setState 업데이터가 돌지 않으므로 ref로 현재 큐를 들고 있는다.
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    },
    [],
  )

  const removeItem = (key: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((i) => i.key !== key)
    })
  }

  /** 자른 결과로 대기 항목을 갈아 끼운다 (원본 File은 그대로 두어 다시 자를 수 있게). */
  const applyCrop = (key: string, processed: ProcessedImage) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        URL.revokeObjectURL(item.previewUrl)
        return {
          ...item,
          processed,
          previewUrl: URL.createObjectURL(processed.thumb.blob),
          cropped: true,
        }
      }),
    )
    setCropKey(null)
    toast('잘랐습니다.')
  }

  const save = async () => {
    if (!items.length) return
    if (!memberId) return toast('멤버를 먼저 선택해 주세요.')
    if (items.some((i) => !i.title.trim())) return toast('제목이 비어 있는 카드가 있어요.')

    setSaving(true)
    try {
      const now = Date.now()
      const images: StoredImage[] = []
      const cards: Card[] = items.map((item, index) => {
        const id = uid()
        images.push({ cardId: id, blob: item.processed.full.blob })
        return {
        id,
        title: item.title.trim(),
        memberId: item.memberId || memberId,
        // 항목에서 따로 고른 게 있으면 그걸 쓰고, 없으면 위에서 고른 값
        categoryId: item.categoryId || categoryId || null,
        memo: '',
        thumb: item.processed.thumb.blob,
        width: item.processed.full.width,
        height: item.processed.full.height,
        bytes: item.processed.full.blob.size + item.processed.thumb.blob.size,
        favorite: 0,
        deleted: 0,
        deletedAt: null,
        status: 'own',
        // 여러 장을 한 번에 올려도 고른 순서대로 정렬되도록 1ms씩 벌린다
        createdAt: now + index,
        updatedAt: now + index,
        }
      })
      await db.transaction('rw', db.cards, db.images, async () => {
        await db.cards.bulkAdd(cards)
        await db.images.bulkAdd(images)
      })
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setItems([])
      toast(`${cards.length}장을 등록했습니다.`)
      navigate('/')
    } catch (error) {
      toast(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const cropItem = items.find((i) => i.key === cropKey) ?? null
  const originalTotal = items.reduce((sum, i) => sum + i.processed.originalBytes, 0)
  const convertedTotal = items.reduce(
    (sum, i) => sum + i.processed.full.blob.size + i.processed.thumb.blob.size,
    0,
  )
  const savedPercent = originalTotal
    ? Math.max(0, Math.round((1 - convertedTotal / originalTotal) * 100))
    : 0

  return (
    <>
      <Header title="포토카드 등록" back />

      <div className="content content--no-fab">
        <div className="page">
          <div className="card-panel">
            <div className="row">
              <label className="field" style={{ marginBottom: 0 }}>
                <span>멤버</span>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                  {members.length === 0 && <option value="">멤버를 먼저 추가하세요</option>}
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span>카테고리</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">없음</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <button
            className="dropzone"
            data-over={dragOver}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const files = Array.from(e.dataTransfer.files)
              if (files.length) return void addFiles(files)
              // 다른 탭에서 이미지를 끌어오면 파일이 아니라 주소가 들어온다
              const dropped =
                e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')
              if (dropped) void addUrls(dropped)
            }}
          >
            <ImageIcon size={30} />
            <strong>사진을 끌어다 놓거나 눌러서 선택</strong>
            여러 장을 한 번에 올릴 수 있고, 다른 탭에서 이미지를 끌어와도 됩니다
            <br />
            {canEncodeWebp()
              ? '업로드하면 자동으로 WebP로 변환됩니다'
              : '이 브라우저는 WebP 변환을 지원하지 않아 JPEG로 저장됩니다'}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void addFiles(files)
            }}
          />

          {/*
            카메라로 바로 찍기.
            capture를 붙이면 파일 고르기 대신 폰 카메라가 바로 열린다.
            다만 한 번에 한 장이고, 찍은 사진이 갤러리에 남는지는 폰 카메라 앱이
            정하는 거라 앱에서 막을 수 없다. 앱 안에서 카메라를 켜야 그 둘이
            해결되는데 그건 HTTPS가 필요하다.
          */}
          {/*
            카메라 두 갈래.
            위는 앱 안에서 연달아 찍는 길, 아래는 폰 카메라 앱을 부르는 길이다.
            앱 안 카메라는 HTTPS에서만 켜지므로, 안 되는 자리에서는 아래만 남는다.
          */}
          {inAppCamera && (
            <button
              className="btn btn--primary btn--block"
              style={{ marginTop: 10 }}
              onClick={() => setShooting(true)}
            >
              <CameraIcon size={18} />
              카메라로 연속 촬영
            </button>
          )}
          <button
            className="btn btn--block"
            style={{ marginTop: 8 }}
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon size={18} />
            {inAppCamera ? '폰 카메라로 한 장씩' : '카메라로 찍어서 등록'}
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              // 같은 장면을 다시 찍어도 change가 뜨도록 값을 비운다
              e.target.value = ''
              if (files.length) void addFiles(files)
            }}
          />

          <div className="card-panel" style={{ marginTop: 12 }}>
            <p>
              인터넷에 있는 이미지 <b>주소로도</b> 등록할 수 있어요. 가져온 사진은 기기에
              변환해 저장하므로, 나중에 원본이 삭제돼도 카드는 그대로 남습니다.
              <br />
              여러 개는 줄바꿈이나 띄어쓰기로 구분하세요.
            </p>
            <form
              className="add-row"
              onSubmit={(e) => {
                e.preventDefault()
                void addUrls(linkInput)
              }}
            >
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://.../photo.jpg"
                spellCheck={false}
              />
              <button className="btn" type="submit" disabled={!linkInput.trim()}>
                <LinkIcon size={17} />
                가져오기
              </button>
            </form>
          </div>

          {busy > 0 && (
            <p className="queue__meta" style={{ marginTop: 12 }}>
              변환 중… {busy}장 남음
            </p>
          )}

          {items.length > 0 && (
            <>
              <h2>
                등록 대기 {items.length}장
                {savedPercent > 0 && (
                  <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12 }}>
                    {'  '}· {formatBytes(originalTotal)} → {formatBytes(convertedTotal)} ({savedPercent}% 절감)
                  </span>
                )}
              </h2>

              <div className="queue">
                {items.map((item) => (
                  <div className="queue__item" key={item.key}>
                    {/* 썸네일이 곧 자르기 버튼이다 — 누를 수 있다는 건 모서리 배지가 알린다 */}
                    <button
                      className="queue__crop"
                      onClick={() => setCropKey(item.key)}
                      aria-label="사진 자르기"
                      title="사진 자르기"
                    >
                      <img className="queue__thumb" src={item.previewUrl} alt="" />
                      <span className="queue__crop-badge" data-on={item.cropped || undefined}>
                        <CropIcon size={13} />
                      </span>
                    </button>
                    <div className="queue__body">
                      <input
                        type="text"
                        value={item.title}
                        placeholder="제목 (예: 라이즈 1집 A ver.)"
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i.key === item.key ? { ...i, title: e.target.value } : i,
                            ),
                          )
                        }
                      />
                      <div className="queue__pair">
                        <select
                          value={item.memberId}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.key === item.key ? { ...i, memberId: e.target.value } : i,
                              ),
                            )
                          }
                        >
                          <option value="">위에서 고른 멤버</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={item.categoryId}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.key === item.key ? { ...i, categoryId: e.target.value } : i,
                              ),
                            )
                          }
                        >
                          <option value="">위에서 고른 분류</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <span className="queue__meta">
                        {item.processed.full.width}×{item.processed.full.height} ·{' '}
                        {formatBytes(item.processed.originalBytes)} →{' '}
                        <b>{formatBytes(item.processed.full.blob.size)}</b>
                      </span>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => removeItem(item.key)}
                      aria-label="목록에서 빼기"
                    >
                      <CloseIcon size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sticky-actions">
                <button
                  className="btn btn--primary btn--block"
                  onClick={save}
                  disabled={saving || busy > 0}
                >
                  <PlusIcon size={18} />
                  {saving ? '저장 중…' : `${items.length}장 등록하기`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {shooting && (
        <CameraCapture onShot={(file) => void addFiles([file])} onClose={() => setShooting(false)} />
      )}

      {cropItem && (
        <CropEditor
          source={cropItem.file}
          onCancel={() => setCropKey(null)}
          onDone={(processed) => applyCrop(cropItem.key, processed)}
        />
      )}
    </>
  )
}
