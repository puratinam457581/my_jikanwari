import { TABS, useNavigation } from '../navigation/NavigationContext.jsx'
import { BookIcon, CheckListIcon, GridIcon, PersonIcon } from './icons.jsx'

const ICONS = {
  timetable: GridIcon,
  schedule: CheckListIcon,
  courseList: BookIcon,
  myPage: PersonIcon,
}

/**
 * PC(横に広い画面)専用のナビゲーション。
 * スマホでは下部のタブバー(TabBar)が、PCではこのサイドバーが表示される。
 * 中身はどちらも同じ4タブで、切り替わるのは並べ方だけ。
 */
export default function Sidebar() {
  const { tab, setTab } = useNavigation()

  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-line bg-void md:flex">
      <div className="border-b border-line px-5 py-4">
        <p className="font-hud text-glow text-base font-bold tracking-widest text-cyan">
          TIMETABLE
        </p>
        <p className="mt-0.5 text-[11px] text-hud-faint">時間割管理</p>
      </div>

      <ul className="flex-1 p-3">
        {TABS.map(({ key, label }) => {
          const Icon = ICONS[key]
          const active = tab === key
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className={`relative mb-1 flex w-full items-center gap-3 rounded-sharp px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-cyan/10 text-cyan'
                    : 'text-hud-dim hover:bg-panel-2 hover:text-hud'
                }`}
              >
                {/* 選択中は左端に発光するバーを出す */}
                {active && (
                  <span
                    aria-hidden
                    className="glow-sm absolute inset-y-1.5 left-0 w-0.5 bg-cyan"
                  />
                )}
                <Icon size={19} strokeWidth={1.5} />
                <span className="font-hud text-sm font-semibold tracking-wide">
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
