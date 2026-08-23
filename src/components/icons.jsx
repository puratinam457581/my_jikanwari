/**
 * アイコンの一覧。
 *
 * 実体は lucide-react(ISCライセンス・無料)。線が細く直線的なアウトライン系で、
 * デザイン仕様3.3の指定に合う。
 *
 * ここで名前を付け替えて再エクスポートしているのは、
 *  - 画面側が「用途の名前」(TeacherIcon など)で書けて読みやすい
 *  - 将来アイコンを差し替えるとき、このファイルだけ直せば済む
 * ため。
 */
export {
  LayoutGrid as GridIcon,
  ListChecks as CheckListIcon,
  BookOpen as BookIcon,
  User as PersonIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Plus as PlusIcon,
  Pencil as PencilIcon,
  GraduationCap as TeacherIcon,
  MapPin as RoomIcon,
  Tag as TagIcon,
  TriangleAlert as AlertIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  X as CloseIcon,
  Trash2 as TrashIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  CalendarClock as CalendarIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Bell as BellIcon,
  BellOff as BellOffIcon,
  RefreshCw as RefreshIcon,
  Share as ShareIcon,
  SquarePlus as AddToHomeIcon,
  CloudOff as OfflineIcon,
  Smartphone as PhoneIcon,
  Info as InfoIcon,
} from 'lucide-react'

/**
 * アイコン共通の既定値。
 * lucide のデフォルトは線が太めなので、細くしてHUDらしい印象にする。
 */
export const ICON_PROPS = {
  strokeWidth: 1.5,
}
