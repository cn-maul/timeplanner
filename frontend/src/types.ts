export interface Settings {
  dayStart: string
  dayEnd: string
}

export type EventCategory = 'meeting' | 'class' | 'life' | 'other'
export type BlockCategory = 'work' | 'study' | 'leisure'

/** 周期事件：固定重复的日程 */
export interface RecurEvent {
  id: string
  title: string
  category: EventCategory
  /** 1=周一 … 7=周日 */
  weekdays: number[]
  start: string
  end: string
  from?: string
  to?: string
  notes?: string
  enabled: boolean
}

/** 单次安排：用户在空闲时段内计划的活动 */
export interface Block {
  id: string
  date: string
  start: string
  end: string
  title: string
  category: BlockCategory
  notes?: string
}

/** 周期事件在某天的一次出现 */
export interface Occurrence {
  eventId: string
  title: string
  category: EventCategory
  start: string
  end: string
}

export interface FreeInterval {
  start: string
  end: string
  minutes: number
}

export interface DayStats {
  fixedMin: number
  plannedMin: number
  freeMin: number
  byCategory: Partial<Record<BlockCategory, number>>
}

export interface DayData {
  date: string
  weekday: number
  isToday: boolean
  events: Occurrence[]
  blocks: Block[]
  free: FreeInterval[]
  stats: DayStats
}

export interface WeekStats {
  fixedMin: number
  plannedMin: number
  freeMin: number
  byCategory: Partial<Record<BlockCategory, number>>
}

export interface WeekData {
  weekStart: string
  weekEnd: string
  settings: Settings
  eventCount: number
  days: DayData[]
  stats: WeekStats
}

/** tix 待处理工单（服务端代理获取的精简视图） */
export interface PendingTicket {
  id: number
  category: string
  content: string
  creator: string
  assignee: string
  createdAt: string
}

/** 工单系统集成配置的部分更新；ticketKey 省略=保持不变，空串=清除 */
export interface IntegrationUpdate {
  ticketUrl: string
  ticketKey?: string
}
