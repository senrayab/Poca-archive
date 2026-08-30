import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronLeft as LuChevronLeft,
  ChevronRight as LuChevronRight,
  ChartColumn,
  Download,
  ArrowLeftRight,
  HardDrive,
  Heart,
  Image as LuImage,
  LayoutGrid,
  Link2,
  Menu,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
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
