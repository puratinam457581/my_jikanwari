import TimetableScreen from './TimetableScreen.jsx'
import ScheduleScreen from './ScheduleScreen.jsx'
import CourseListScreen from './CourseListScreen.jsx'
import MyPageScreen from './MyPageScreen.jsx'
import CourseDetailScreen from './CourseDetailScreen.jsx'
import DevDataPanel from '../DevDataPanel.jsx'
import {
  CourseEditScreen,
  CreditSettingsScreen,
  PeriodSettingsScreen,
  ScheduleEditScreen,
  SemesterSwitchScreen,
} from './PlaceholderScreens.jsx'
import { AttendanceEntryModal, CoursePickerModal } from './modals.jsx'

/** 下部タブに対応する4画面 */
export const TAB_SCREENS = {
  timetable: TimetableScreen,
  schedule: ScheduleScreen,
  courseList: CourseListScreen,
  myPage: MyPageScreen,
}

/**
 * タブ画面の上に重ねて開く画面。
 * hideTabBar: true にすると、その画面ではタブバーを隠す(入力フォームなど)
 */
export const STACK_SCREENS = {
  courseDetail: { component: CourseDetailScreen },
  courseEdit: { component: CourseEditScreen, hideTabBar: true },
  scheduleEdit: { component: ScheduleEditScreen, hideTabBar: true },
  semesterSwitch: { component: SemesterSwitchScreen },
  periodSettings: { component: PeriodSettingsScreen },
  creditSettings: { component: CreditSettingsScreen },
  devData: { component: DevDataPanel },
}

/** さらにその上に重ねるモーダル */
export const MODAL_SCREENS = {
  attendanceEntry: AttendanceEntryModal,
  coursePicker: CoursePickerModal,
}
