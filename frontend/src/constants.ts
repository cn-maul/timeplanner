import type { BlockCategory, EventCategory } from './types'

export interface CategoryMeta {
  label: string
  /** 时间轴条目：中性或单色系的浅底 + 左侧色条（色条颜色为内联样式，避免动态类名被裁剪） */
  cell: string
  /** 左侧 3px 色条的颜色 */
  bar: string
  /** 圆点颜色（内联样式） */
  dot: string
  /** 标签样式 */
  chip: string
}

/** 固定日程：结构与安排区分——中性灰底 + 细分隔线，色相只用来暗示类别 */
export const EVENT_CATEGORIES: Record<EventCategory, CategoryMeta> = {
  meeting: {
    label: '会议',
    cell: 'bg-black/[0.05] text-ink',
    bar: '#8e8e93',
    dot: '#8e8e93',
    chip: 'bg-black/[0.05] text-ink-2',
  },
  class: {
    label: '课程',
    cell: 'bg-black/[0.05] text-ink',
    bar: '#5e5ce6',
    dot: '#5e5ce6',
    chip: 'bg-black/[0.05] text-ink-2',
  },
  life: {
    label: '生活',
    cell: 'bg-black/[0.05] text-ink',
    bar: '#ff9f0a',
    dot: '#ff9f0a',
    chip: 'bg-black/[0.05] text-ink-2',
  },
  other: {
    label: '其他',
    cell: 'bg-black/[0.05] text-ink',
    bar: '#aeaeb2',
    dot: '#aeaeb2',
    chip: 'bg-black/[0.05] text-ink-2',
  },
}

/** 已安排活动：白底 + 左侧色条 + 细描边，浮在灰底的固定日程之上 */
export const BLOCK_CATEGORIES: Record<BlockCategory, CategoryMeta> = {
  work: {
    label: '工作',
    cell: 'bg-white ring-1 ring-black/[0.06] text-ink',
    bar: '#0071e3',
    dot: '#0071e3',
    chip: 'bg-accent/[0.08] text-accent-link',
  },
  study: {
    label: '学习',
    cell: 'bg-white ring-1 ring-black/[0.06] text-ink',
    bar: '#5e5ce6',
    dot: '#5e5ce6',
    chip: 'bg-accent/[0.08] text-accent-link',
  },
  leisure: {
    label: '休闲',
    cell: 'bg-white ring-1 ring-black/[0.06] text-ink',
    bar: '#30b06b',
    dot: '#30b06b',
    chip: 'bg-accent/[0.08] text-accent-link',
  },
}

export const EVENT_CATEGORY_KEYS = Object.keys(EVENT_CATEGORIES) as EventCategory[]
export const BLOCK_CATEGORY_KEYS = Object.keys(BLOCK_CATEGORIES) as BlockCategory[]

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
export const weekdayLabel = (w: number) => WEEKDAY_LABELS[w - 1]
