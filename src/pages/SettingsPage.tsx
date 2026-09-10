import { useEffect, useRef, useState } from 'react'
import { Header } from '@/components/AppShell'
import {
  AutoThemeIcon,
  BackupIcon,
  CutDiscIcon,
  CutNotchIcon,
  DownloadIcon,
  EditIcon,
  InstallIcon,
  MoonIcon,
  PaletteIcon,
  ResetIcon,
  SkinIcon,
  StorageIcon,
  SunIcon,
  SyncIcon,
  UploadIcon,
} from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import { seedIfEmpty } from '@/db/seed'
import {
  backupFilename,
  downloadBlob,
  exportArchive,
  getLastBackupAt,
  importArchive,
  markBackedUp,
} from '@/lib/backup'
import { DEFAULT_APP_NAME, setAppName, useAppNameInput } from '@/lib/appName'
import { BUILD_TIME, checkForUpdate } from '@/lib/update'
import { formatBytes, formatDateTime, relativeDays } from '@/lib/format'
import {
  ACCENT_PRESETS,
  FAV_CUTS,
  SKINS,
  setAccent,
  setFavCut,
  setSkin,
  setThemeMode,
  useAccent,
  useFavCut,
  useSkin,
  useThemeMode,
  type ThemeMode,
} from '@/lib/theme'

/** 미리보기 아이콘은 실제 마스크와 같은 곡선을 쓴다 */
const CUT_ICONS = { notch: CutNotchIcon, disc: CutDiscIcon } as const

const THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; icon: JSX.Element }> = [
  { mode: 'system', label: '시스템', icon: <AutoThemeIcon size={16} /> },
  { mode: 'light', label: '라이트', icon: <SunIcon size={16} /> },
  { mode: 'dark', label: '다크', icon: <MoonIcon size={16} /> },
]

export function SettingsPage() {
  const [themeMode, resolved] = useThemeMode()
  const skin = useSkin()
  const favCut = useFavCut()
  const accent = useAccent()
  const appNameInput = useAppNameInput()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [working, setWorking] = useState<'export' | 'import' | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastBackup, setLastBackup] = useState(getLastBackupAt())
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void navigator.storage?.estimate?.().then((estimate) => {
      if (estimate.usage != null && estimate.quota != null) {
        setQuota({ usage: estimate.usage, quota: estimate.quota })
      }
    })
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const exportNow = async () => {
    setWorking('export')
    try {
      const blob = await exportArchive()
      downloadBlob(blob, backupFilename())
      markBackedUp()
      setLastBackup(Date.now())
      toast(`백업 파일을 내려받았습니다 (${formatBytes(blob.size)}).`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '백업에 실패했습니다.')
    } finally {
      setWorking(null)
    }
  }

  const importNow = async (file: File) => {
    setWorking('import')
    try {
      const result = await importArchive(file)
      toast(
        `카드 ${result.cards}장, 멤버 ${result.members}명을 복원했습니다.` +
          (result.skipped ? ` (중복 ${result.skipped}장 건너뜀)` : ''),
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : '복원에 실패했습니다.')
    } finally {
      setWorking(null)
    }
  }

  /**
   * 새로 배포된 화면으로 맞춘다.
   * 받아온 게 있을 때만 다시 여는 이유는, 이미 최신인데 새로고침해 봐야
   * 같은 화면이 다시 뜰 뿐이어서다 — 그건 결과로 말해주는 편이 낫다.
   */
  const syncNow = async () => {
    setSyncing(true)
    try {
      const result = await checkForUpdate()
      if (result === 'latest') {
        toast('이미 최신 화면입니다.')
        return
      }
      toast(result === 'updated' ? '새 버전을 받았습니다. 다시 엽니다…' : '다시 엽니다…')
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      toast('확인하지 못했습니다. 네트워크를 확인해 주세요.')
    } finally {
      setSyncing(false)
    }
  }

  /** 브라우저가 저장소를 임의로 비우지 않도록 영구 저장 권한을 요청한다. */
  const requestPersist = async () => {
    const granted = await navigator.storage?.persist?.()
    setPersisted(granted ?? false)
    toast(
      granted
        ? '영구 저장이 켜졌습니다. 브라우저가 임의로 데이터를 지우지 않아요.'
        : '브라우저가 영구 저장을 허용하지 않았습니다. 홈 화면에 설치하면 가능성이 높아져요.',
    )
  }

  /*
   * 파일 이름이 그대로 제목이 되던 시절에 붙은 것들을 비운다.
   *
   * 'IMG_1234'나 'Screenshot_20260907_…', 다른 앱이 붙인 긴 숫자는 이름이
   * 아니라 파일이 들고 온 꼬리표다. 사람이 적은 제목은 건드리지 않도록,
   * 아래 두 가지만 고른다.
   *
   * 숫자는 '전부 숫자'만 보면 놓치는 게 많다. 찍은 날짜와 시각을 밑줄로
   * 이어 붙인 20260907_165454 같은 것이 흔해서다. 그래서 숫자 사이를
   * 잇는 밑줄·붙임표·마침표·빈칸은 숫자의 일부로 치고, 그것들을 걷어낸
   * 뒤에도 숫자만 남으면 꼬리표로 본다. 잇는 자리에만 허락하므로
   * '_2026'이나 '2026-'처럼 한쪽이 빈 것은 걸리지 않는다.
   *
   * 몇 번을 눌러도 결과가 같다 — 비운 것은 다음번에 걸리지 않는다.
   */
  const NUMBERS_ONLY = /^\d+(?:[_\-. ]\d+)*$/
  /*
   * 카메라와 화면 갈무리, 메신저가 붙이는 머리말. 뒤에 무엇이 오든 이걸로 시작하면
   * 사람이 지은 이름이 아니다. 대소문자는 가리지 않는다 — 기기마다 IMG_,
   * img_가 갈리는데 그건 이름의 뜻과 상관이 없다. 새 기기를 만나면 여기에
   * 한 줄 더하면 된다.
   */
  const FILE_PREFIXES = ['IMG_', 'KakaoTalk_', 'Screenshot_']
  const looksLikeFileName = (title: string) => {
    const t = title.trim()
    if (t === '') return false
    const head = t.toLowerCase()
    return NUMBERS_ONLY.test(t) || FILE_PREFIXES.some((p) => head.startsWith(p.toLowerCase()))
  }

  const clearFileNameTitles = async () => {
    const rows = await db.cards.toArray()
    const targets = rows.filter((c) => looksLikeFileName(c.title)).map((c) => c.id)
    if (!targets.length) return toast('비울 제목이 없습니다.')
    if (!confirm(`${targets.length}장의 제목을 비웁니다. 되돌릴 수 없어요. 계속할까요?`)) return

    const now = Date.now()
    await db.cards.where('id').anyOf(targets).modify({ title: '', updatedAt: now })
    toast(`${targets.length}장의 제목을 비웠습니다.`)
  }

  const resetAll = async () => {
    if (!confirm('모든 포토카드와 멤버 정보를 지웁니다. 되돌릴 수 없어요. 계속할까요?')) return
    if (!confirm('정말로 전체 삭제할까요? 먼저 백업을 받아두는 것을 권합니다.')) return
    await db.transaction('rw', db.cards, db.images, db.members, db.categories, async () => {
      await db.cards.clear()
      await db.images.clear()
      await db.members.clear()
      await db.categories.clear()
    })
    await seedIfEmpty()
    toast('초기화했습니다.')
  }

  return (
    <>
      <Header title="백업 · 설정" />

      <div className="content content--no-fab">
        <div className="page">
          <h2>
            <SkinIcon size={15} />
            인터페이스
          </h2>
          <div className="card-panel">
            <p>
              보관함 화면 제목과 서랍 메뉴에 쓰이는 이름입니다. 비워두면
              <b> {DEFAULT_APP_NAME}</b>로 돌아갑니다.
            </p>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>보관함 이름</span>
              <input
                type="text"
                value={appNameInput}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={DEFAULT_APP_NAME}
                maxLength={40}
              />
            </label>
          </div>

          <div className="card-panel">
            <p>
              스킨은 색·둥글기·그림자를 한 벌로 묶은 것입니다. 아래 테마(다크·라이트)와
              따로 놀지 않고, 고른 스킨 안에서 다시 밝기가 갈립니다.
            </p>
            <div className="skins">
              {SKINS.map((option) => (
                <button
                  key={option.id}
                  className="skin"
                  data-preview={option.id}
                  aria-pressed={skin === option.id}
                  onClick={() => setSkin(option.id)}
                >
                  <span className="skin__swatch" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>{option.name}</b>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="card-panel">
            <p>
              자세히보기에서 좋아요 하트가 앉는 자리입니다. 카드 오른쪽 위를
              <b> 모서리째 베어내거나</b>, 그 안에 <b>사진 조각을 하나 남길</b> 수 있어요.
            </p>
            <div className="segmented" role="group" aria-label="좋아요 하트 자리">
              {FAV_CUTS.map((option) => {
                const Icon = CUT_ICONS[option.id]
                return (
                  <button
                    key={option.id}
                    aria-pressed={favCut === option.id}
                    onClick={() => setFavCut(option.id)}
                  >
                    <Icon size={20} />
                    {option.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card-panel">
            <p>
              테마를 고르세요. <b>시스템</b>은 폰·PC의 다크 모드 설정을 그대로 따라갑니다.
              지금은 <b>{resolved === 'dark' ? '다크' : '라이트'}</b>로 보이는 중이에요.
            </p>
            <div className="segmented" role="group" aria-label="테마">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  aria-pressed={themeMode === option.mode}
                  onClick={() => setThemeMode(option.mode)}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-panel">
            <p>
              포인트 색입니다. 선택된 탭, 등록 버튼, 좋아요 하트처럼 강조되는 곳에
              쓰입니다. 고르지 않으면 스킨이 정한 색을 씁니다.
            </p>
            <div className="swatches">
              {ACCENT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  className="swatch"
                  style={{ background: hex }}
                  aria-label={hex}
                  aria-pressed={accent === hex}
                  onClick={() => setAccent(hex)}
                />
              ))}
              <label className="swatch swatch--pick" aria-label="직접 고르기">
                <PaletteIcon size={17} />
                <input
                  type="color"
                  value={accent ?? '#ff3d57'}
                  onChange={(e) => setAccent(e.target.value)}
                />
              </label>
            </div>
            <button
              className="btn btn--sm btn--ghost"
              disabled={accent === null}
              onClick={() => setAccent(null)}
            >
              스킨 기본색으로
            </button>
          </div>

          <h2>
            <BackupIcon size={15} />
            백업
          </h2>
          <div className="card-panel">
            <p>
              모든 카드 이미지와 정보를 ZIP 한 개로 묶어 내려받습니다. 이 앱의 데이터는
              브라우저 안에만 있어서, <b>기기를 바꾸거나 브라우저 데이터를 지우면 사라집니다.</b>{' '}
              주기적으로 클라우드 드라이브에 백업해 두세요.
              {lastBackup && (
                <>
                  <br />
                  마지막 백업: {relativeDays(lastBackup)}
                </>
              )}
            </p>
            <div className="row">
              <button className="btn btn--primary" onClick={exportNow} disabled={working !== null}>
                <DownloadIcon size={18} />
                {working === 'export' ? '만드는 중…' : '백업 내보내기'}
              </button>
              <button
                className="btn"
                onClick={() => fileRef.current?.click()}
                disabled={working !== null}
              >
                <UploadIcon size={18} />
                {working === 'import' ? '복원 중…' : '백업 가져오기'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importNow(file)
              }}
            />
          </div>

          <h2>
            <EditIcon size={15} />
            제목 정리
          </h2>
          <div className="card-panel">
            <p>
              예전에는 파일 이름이 그대로 제목이 됐습니다. 그래서{' '}
              <b>IMG_ · KakaoTalk_ · Screenshot_으로 시작하는 이름</b>이나 <b>숫자뿐인 제목</b>(20260907_165454처럼
              밑줄로 이어 붙인 것도 포함)이 붙어 있을 수 있어요. 그런 것만 골라 비웁니다 — 직접
              적으신 제목은 건드리지 않습니다.
              <br />
              되돌릴 수 없으니 <b>백업을 먼저 내려받아 두세요.</b>
            </p>
            <button className="btn btn--block" onClick={clearFileNameTitles}>
              <EditIcon size={17} />
              파일 이름으로 된 제목 비우기
            </button>
          </div>

          <h2>
            <StorageIcon size={15} />
            저장소
          </h2>
          <div className="card-panel">
            <p>
              {quota
                ? `${formatBytes(quota.usage)} 사용 중 · 최대 약 ${formatBytes(quota.quota)}`
                : '저장소 사용량을 확인할 수 없는 브라우저입니다.'}
              <br />
              영구 저장: {persisted === null ? '확인 중' : persisted ? '켜짐' : '꺼짐'}
            </p>
            {persisted === false && (
              <button className="btn btn--block" onClick={requestPersist}>
                영구 저장 요청하기
              </button>
            )}
          </div>

          <h2>
            <SyncIcon size={15} />
            업데이트
          </h2>
          <div className="card-panel">
            <p>
              이 앱은 화면 파일을 기기에 저장해 두고 오프라인에서도 열리게 합니다. 그래서
              새 버전이 올라가도 <b>새로고침만으로는 바뀌지 않을 수 있어요.</b> 아래 버튼은
              새 버전이 있는지 직접 확인하고, 있으면 받아서 다시 엽니다.
              <br />
              지금 화면: {formatDateTime(Date.parse(BUILD_TIME))} 빌드
            </p>
            <button className="btn btn--block" onClick={syncNow} disabled={syncing}>
              <SyncIcon size={18} />
              {syncing ? '확인 중…' : '최신으로 맞추기'}
            </button>
          </div>

          <h2>
            <InstallIcon size={15} />
            앱으로 설치
          </h2>
          <div className="card-panel">
            <p>
              브라우저 메뉴에서 <b>홈 화면에 추가</b>(iOS는 공유 → 홈 화면에 추가)를 누르면
              주소창 없이 앱처럼 열리고, 오프라인에서도 보관함을 볼 수 있습니다.
            </p>
          </div>

          <h2>
            <ResetIcon size={15} />
            초기화
          </h2>
          <div className="card-panel">
            <p>모든 데이터를 지우고 처음 상태로 되돌립니다.</p>
            <button className="btn btn--danger btn--block" onClick={resetAll}>
              전체 삭제
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
