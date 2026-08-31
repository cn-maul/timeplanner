import type { BlockCategory, EventCategory } from './types'

export interface CategoryMeta {
  label: string
  /** 时间轴条目样式：低饱和底色 + 左侧色条 + 同色系深色文字，事件与安排统一使用 */
  cell: string
  dot: string
  chip: string
}

export const EVENT_CATEGORIES: Record<EventCategory, CategoryMeta> = {
  meeting: {
    label: '会议',
    cell: 'border-l-[3px] border-blue-500 bg-blue-50/95 text-blue-800',
    dot: 'bg-blue-500',
    chip: 'border-blue-200 bg-blue-100 text-blue-700',
  },
  class: {
    label: '课程',
    cell: 'border-l-[3px] border-violet-500 bg-violet-50/95 text-violet-800',
    dot: 'bg-violet-500',
    chip: 'border-violet-200 bg-violet-100 text-violet-700',
  },
  fitness: {
    label: '健身',
    cell: 'border-l-[3px] border-emerald-500 bg-emerald-50/95 text-emerald-800',
    dot: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  },
  life: {
    label: '生活',
    cell: 'border-l-[3px] border-amber-500 bg-amber-50/95 text-amber-800',
    dot: 'bg-amber-500',
    chip: 'border-amber-200 bg-amber-100 text-amber-700',
  },
  other: {
    label: '其他',
    cell: 'border-l-[3px] border-slate-400 bg-slate-100/95 text-slate-700',
    dot: 'bg-slate-500',
    chip: 'border-slate-200 bg-slate-100 text-slate-600',
  },
}

export const BLOCK_CATEGORIES: Record<BlockCategory, CategoryMeta> = {
  work: {
    label: '工作',
    cell: 'border-l-[3px] border-indigo-500 bg-indigo-50/95 text-indigo-800',
    dot: 'bg-indigo-500',
    chip: 'border-indigo-200 bg-indigo-100 text-indigo-700',
  },
  study: {
    label: '学习',
    cell: 'border-l-[3px] border-cyan-500 bg-cyan-50/95 text-cyan-800',
    dot: 'bg-cyan-500',
    chip: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  },
  leisure: {
    label: '休闲',
    cell: 'border-l-[3px] border-pink-500 bg-pink-50/95 text-pink-800',
    dot: 'bg-pink-500',
    chip: 'border-pink-200 bg-pink-100 text-pink-700',
  },
  personal: {
    label: '个人事务',
    cell: 'border-l-[3px] border-orange-500 bg-orange-50/95 text-orange-800',
    dot: 'bg-orange-500',
    chip: 'border-orange-200 bg-orange-100 text-orange-700',
  },
}

export const EVENT_CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES) as EventCategory[]
export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[]

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
export const weekdayLabel = (w: number) => WEEKDAY_LABELS[w - 1]
