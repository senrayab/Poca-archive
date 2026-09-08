import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChartColumn,
  Crop,
  Download,
  FlipHorizontal,
  FlipVertical,
  ArrowLeftRight,
  HardDrive,
  Heart,
  Image as LuImage,
  ImagePlus,
  LayoutGrid,
  Link2,
  Menu,
  Monitor,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Smartphone,
  SquarePen,
  Sun,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
  ZoomIn,
} from 'lucide-react'

/*
 * 아이콘은 Lucide를 쓴다. 화면마다 이름을 직접 import 하면 어떤 아이콘을 쓰는지
 * 흩어지므로, 여기서 앱이 쓰는 이름으로만 한 번 감싸 내보낸다.
 * 아이콘을 바꾸고 싶으면 이 파일의 매핑만 고치면 된다.
 */

interface IconProps {
  size?: number
  className?: string
}

/** 라인 두께는 앱 전체에서 하나로 맞춘다 (Lucide 기본 2는 작은 크기에서 무겁다). */
const STROKE = 1.8

export const MenuIcon = ({ size = 22, className }: IconProps) => (
  <Menu size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const SearchIcon = ({ size = 22, className }: IconProps) => (
  <Search size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const PlusIcon = ({ size = 22, className }: IconProps) => (
  <Plus size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const CloseIcon = ({ size = 22, className }: IconProps) => (
  <X size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const TrashIcon = ({ size = 22, className }: IconProps) => (
  <Trash2 size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)

/** 즐겨찾기는 켜졌을 때 속을 채운다. */
export const HeartIcon = ({
  size = 22,
  className,
  filled,
}: IconProps & { filled?: boolean }) => (
  <Heart
    size={size}
    strokeWidth={STROKE}
    fill={filled ? 'currentColor' : 'none'}
    className={className}
    aria-hidden="true"
  />
)

export const EditIcon = ({ size = 22, className }: IconProps) => (
  <SquarePen size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const RestoreIcon = ({ size = 22, className }: IconProps) => (
  <ArchiveRestore size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const UploadIcon = ({ size = 22, className }: IconProps) => (
  <Upload size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const DownloadIcon = ({ size = 22, className }: IconProps) => (
  <Download size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ImageIcon = ({ size = 22, className }: IconProps) => (
  <LuImage size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ZoomIcon = ({ size = 22, className }: IconProps) => (
  <ZoomIn size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)

/*
 * 자르기 화면의 손잡이들.
 *
 * 원근 둘은 Lucide의 flip 아이콘을 쓴다. 이름은 '뒤집기'지만 그림은
 * 네모를 점선 중심축이 가르는 모양이고, 그 축이 바로 이 손잡이가 무엇을
 * 중심으로 카드를 눕히는지다 — 위아래 세우기는 가로축(FlipVertical),
 * 좌우 세우기는 세로축(FlipHorizontal). 축을 보여주는 그림이라 짝이 맞는다.
 */
export const RotateShapeIcon = ({ size = 22, className }: IconProps) => (
  <RotateCw size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const TiltVerticalIcon = ({ size = 22, className }: IconProps) => (
  <FlipVertical size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const TiltHorizontalIcon = ({ size = 22, className }: IconProps) => (
  <FlipHorizontal size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)

export const CropIcon = ({ size = 22, className }: IconProps) => (
  <Crop size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ImageSwapIcon = ({ size = 22, className }: IconProps) => (
  <ImagePlus size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ChartIcon = ({ size = 22, className }: IconProps) => (
  <ChartColumn size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const SettingsIcon = ({ size = 22, className }: IconProps) => (
  <Settings size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const UsersIcon = ({ size = 22, className }: IconProps) => (
  <Users size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const TagIcon = ({ size = 22, className }: IconProps) => (
  <Tag size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const GridIcon = ({ size = 22, className }: IconProps) => (
  <LayoutGrid size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ChevronLeft = ({ size = 22, className }: IconProps) => (
  <LuChevronLeft size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ChevronRight = ({ size = 22, className }: IconProps) => (
  <LuChevronRight size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const CheckIcon = ({ size = 22, className }: IconProps) => (
  <Check size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const SunIcon = ({ size = 22, className }: IconProps) => (
  <Sun size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const MoonIcon = ({ size = 22, className }: IconProps) => (
  <Moon size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
/** '시스템 설정 따르기' — 기기를 그대로 따라간다는 뜻으로 모니터를 쓴다. */
export const AutoThemeIcon = ({ size = 22, className }: IconProps) => (
  <Monitor size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
/*
 * 찜 하트 자리 미리보기. 카드 실루엣의 오른쪽 위를 베어낸 두 모양이다.
 *
 * 곡선은 global.css의 --fav-shape와 같은 값에서 왔다 — 파낸 원(중심 22,22)과
 * 변에 물리는 반지름 14 필렛. 한쪽을 고치면 다른 쪽도 같이 고쳐야 한다.
 */
const CutPreview = ({ size, className, d, disc }: IconProps & { d: string; disc?: boolean }) => (
  <svg
    width={(size ?? 22) * (100 / 128)}
    height={size ?? 22}
    viewBox="0 0 100 128"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
    {disc && <circle cx="78" cy="22" r="21" />}
  </svg>
)

export const CutNotchIcon = ({ size = 22, className }: IconProps) => (
  <CutPreview
    size={size}
    className={className}
    d="M14 0H37.788A14 14 0 0 1 51.519 16.732A27 27 0 0 0 83.268 48.481A14 14 0 0 1 100 62.212V114A14 14 0 0 1 86 128H14A14 14 0 0 1 0 114V14A14 14 0 0 1 14 0Z"
  />
)
export const CutDiscIcon = ({ size = 22, className }: IconProps) => (
  <CutPreview
    size={size}
    className={className}
    disc
    d="M14 0H34.733A14 14 0 0 1 48.5 16.545A30 30 0 0 0 83.455 51.5A14 14 0 0 1 100 65.267V114A14 14 0 0 1 86 128H14A14 14 0 0 1 0 114V14A14 14 0 0 1 14 0Z"
  />
)

export const SyncIcon = ({ size = 22, className }: IconProps) => (
  <RefreshCw size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const SkinIcon = ({ size = 22, className }: IconProps) => (
  <Palette size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const HistoryIcon = ({ size = 22, className }: IconProps) => (
  <ArrowLeftRight size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const LinkIcon = ({ size = 22, className }: IconProps) => (
  <Link2 size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const PaletteIcon = ({ size = 22, className }: IconProps) => (
  <Palette size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const StorageIcon = ({ size = 22, className }: IconProps) => (
  <HardDrive size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const BackupIcon = ({ size = 22, className }: IconProps) => (
  <Archive size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const InstallIcon = ({ size = 22, className }: IconProps) => (
  <Smartphone size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
export const ResetIcon = ({ size = 22, className }: IconProps) => (
  <RotateCcw size={size} strokeWidth={STROKE} className={className} aria-hidden="true" />
)
