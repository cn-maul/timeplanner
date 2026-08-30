import type { BlockCategory, EventCategory } from './types'

export interface CategoryMeta {
  label: string
  /** 周期事件在时间轴上的实色样式 */
  solid: string
  /** 单次安排在时间轴上的浅色样式 */
  soft: string
  dot: string
  chip: string
}

export const EVENT_CATEGORIES: Record<EventCategory, CategoryMeta> = {
  meeting: { label: '会议', solid: 'bg-blue-500/90 text-white', soft: '', dot: 'bg-blue-500', chip: 'border-blue-200 bg-blue-100 text-blue-700' },
  class: { label: '课程', solid: 'bg-violet-500/90 text-white', soft: '', dot: 'bg-violet-500', chip: 'border-violet-200 bg-violet-100 text-violet-700' },
  fitness: { label: '健身', solid: 'bg-emerald-500/90 text-white', soft: '', dot: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-100 text-emerald-700' },
  life: { label: '生活', solid: 'bg-amber-500/90 text-white', soft: '', dot: 'bg-amber-500', chip: 'border-amber-200 bg-amber-100 text-amber-700' },
  other: { label: '其他', solid: 'bg-slate-500/90 text-white', soft: '', dot: 'bg-slate-500', chip: 'border-slate-200 bg-slate-100 text-slate-600' },
}

export const BLOCK_CATEGORIES: Record<BlockCategory, CategoryMeta> = {
  work: { label: '工作', solid: '', soft: 'border-l-4 border-indigo-500 bg-indigo-50 text-indigo-900', dot: 'bg-indigo-500', chip: 'border-indigo-200 bg-indigo-100 text-indigo-700' },
  study: { label: '学习', solid: '', soft: 'border-l-4 border-cyan-500 bg-cyan-50 text-cyan-900', dot: 'bg-cyan-500', chip: 'border-cyan-200 bg-cyan-100 text-cyan-700' },
  leisure: { label: '休闲', solid: '', soft: 'border-l-4 border-pink-500 bg-pink-50 text-pink-900', dot: 'bg-pink-500', chip: 'border-pink-200 bg-pink-100 text-pink-700' },
  personal: { label: '个人事务', solid: '', soft: 'border-l-4 border-orange-500 bg-orange-50 text-orange-900', dot: 'bg-orange-500', chip: 'border-orange-200 bg-orange-100 text-orange-700' },
}

export const EVENT_CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES) as EventCategory[]
export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[]

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
export const weekdayLabel = (w: number) => WEEKDAY_LABELS[w - 1]
