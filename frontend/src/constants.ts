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
    // 用偏品红的 purple 而不是 violet，避免与「工作」的 indigo 混淆
    cell: 'border-l-[3px] border-purple-500 bg-purple-50/95 text-purple-800',
    dot: 'bg-purple-500',
    chip: 'border-purple-200 bg-purple-100 text-purple-700',
  },
  life: {
    label: '生活',
    cell: 'border-l-[3px] border-rose-500 bg-rose-50/95 text-rose-800',
    dot: 'bg-rose-500',
    chip: 'border-rose-200 bg-rose-100 text-rose-700',
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
}

export const EVENT_CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES) as EventCategory[]
export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[]

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
export const weekdayLabel = (w: number) => WEEKDAY_LABELS[w - 1]
