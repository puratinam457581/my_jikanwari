import { TABS, useNavigation } from '../navigation/NavigationContext.jsx'
import { BookIcon, CheckListIcon, GridIcon, PersonIcon } from './icons.jsx'

const ICONS = {
  timetable: GridIcon,
  schedule: CheckListIcon,
  courseList: BookIcon,
  myPage: PersonIcon,
}

/** 画面下部に固定されるタブバー(spec 3章) */
export default function TabBar() {
  const { tab, setTab } = useNavigation()

  return (
    <nav
      className="shrink-0 border-t border-neutral-200 bg-white"
      // iPhoneのホームバーと重ならないよう、下端に安全余白を足す
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {TABS.map(({ key, label }) => {
          const Icon = ICONS[key]
          const active = tab === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 ${
                  active ? 'text-sky-600' : 'text-neutral-400'
                }`}
              >
                <Icon width={22} height={22} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
