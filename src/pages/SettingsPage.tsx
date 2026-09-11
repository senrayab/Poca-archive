import { Header } from '@/components/AppShell'
import {
  AutoThemeIcon,
  CutDiscIcon,
  CutNotchIcon,
  MoonIcon,
  PaletteIcon,
  SkinIcon,
  SunIcon,
} from '@/components/Icons'
import { DEFAULT_APP_NAME, setAppName, useAppNameInput } from '@/lib/appName'
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

/**
 * 보이는 모습을 고르는 곳.
 *
 * 이름, 스킨, 하트 자리, 테마, 포인트 색 — 전부 '어떻게 보일까'다.
 * 데이터를 다루는 일(백업·정리·초기화)은 백업 · 관리로 갈라 나갔다.
 */
export function SettingsPage() {
  const [themeMode, resolved] = useThemeMode()
  const skin = useSkin()
  const favCut = useFavCut()
  const accent = useAccent()
  const appNameInput = useAppNameInput()

  return (
    <>
      <Header title="설정" />

      <div className="content">
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
                  {/*
                    스킨이 색만 갈아끼우던 때는 색 띠 하나로 충분했다.
                    이제는 짜임이 갈리므로 짜임을 보여준다 — 머리가 어떻게
                    생겼는지, 한 줄에 몇 장인지, 길찾기가 어디 있는지.
                    고르기 전에 알 수 있어야 고르는 값이 있다.
                  */}
                  <span className="skin__shot" aria-hidden="true">
                    <i className="skin__pvhead" />
                    <span className="skin__pvgrid">
                      {Array.from({ length: 12 }, (_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                    <i className="skin__pvnav" />
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
        </div>
      </div>
    </>
  )
}
