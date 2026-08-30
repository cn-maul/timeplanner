import { useMemo, type CSSProperties } from 'react'
import type { Block, DayData, Occurrence, Settings } from '../types'
import { BLOCK_CATEGORIES, EVENT_CATEGORIES, weekdayLabel } from '../constants'
import { mm, shortDate } from '../util'

interface Props {
  days: DayData[]
  settings: Settings
  rowHeight?: number
  /** 点击空闲时段：date、起始分钟、结束分钟；游客模式下不传，空闲格仅展示 */
  onCreateIn?: (date: string, start: number, end: number) => void
  onEditBlock?: (block: Block) => void
  onEditEvent?: (occ: Occurrence) => void
  onOpenDay?: (date: string) => void
}

type Positioned =
  | { kind: 'event'; occ: Occurrence }
  | { kind: 'block'; block: Block }

type Laid = Positioned & {
  start: number
  end: number
  col: number
  cols: number
}

/** 同一天内重叠的条目分簇并按列展开布局 */
function packOverlaps(entries: { pos: Positioned; start: number; end: number }[]): Laid[] {
  const sorted = [...entries].sort((a, b) => a.start - b.start || a.end - b.end)
  const out: Laid[] = []
  let cluster: { entry: (typeof sorted)[number]; col: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    if (cluster.length === 0) return
    const cols = Math.max(...cluster.map((c) => c.col)) + 1
    for (const c of cluster) {
      out.push({ ...c.entry.pos, start: c.entry.start, end: c.entry.end, col: c.col, cols })
    }
    cluster = []
    clusterEnd = -1
  }
  for (const entry of sorted) {
    if (cluster.length > 0 && entry.start >= clusterEnd) flush()
    const colEnds: number[] = []
    for (const c of cluster) colEnds[c.col] = Math.max(colEnds[c.col] ?? 0, c.entry.end)
    let col = 0
    while (colEnds[col] !== undefined && colEnds[col] > entry.start) col++
    cluster.push({ entry, col })
    clusterEnd = Math.max(clusterEnd, entry.end)
  }
  flush()
  return out
}

export default function WeekGrid({ days, settings, rowHeight = 52, onCreateIn, onEditBlock, onEditEvent, onOpenDay }: Props) {
  const startMin = mm(settings.dayStart)
  const endMin = mm(settings.dayEnd)
  const totalH = ((endMin - startMin) / 60) * rowHeight

  const labelHours = useMemo(() => {
    const out: number[] = []
    for (let h = Math.floor(startMin / 60); h * 60 < endMin; h++) out.push(h)
    return out
  }, [startMin, endMin])

  const nowMins = useMemo(() => {
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    return mins >= startMin && mins <= endMin ? mins : null
  }, [startMin, endMin])

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="w-14 shrink-0 border-r border-slate-200">
        <div className="h-10 border-b border-slate-200" />
        <div className="relative" style={{ height: totalH }}>
          {labelHours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-slate-400"
              style={{ top: ((h * 60 - startMin) / 60) * rowHeight }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>
      {days.map((day) => (
        <DayColumn
          key={day.date}
          day={day}
          startMin={startMin}
          endMin={endMin}
          rowHeight={rowHeight}
          totalH={totalH}
          nowMins={nowMins}
          onCreateIn={onCreateIn}
          onEditBlock={onEditBlock}
          onEditEvent={onEditEvent}
          onOpenDay={onOpenDay}
        />
      ))}
    </div>
  )
}

interface DayColumnProps {
  day: DayData
  startMin: number
  endMin: number
  rowHeight: number
  totalH: number
  nowMins: number | null
  onCreateIn?: Props['onCreateIn']
  onEditBlock?: Props['onEditBlock']
  onEditEvent?: Props['onEditEvent']
  onOpenDay?: Props['onOpenDay']
}

function DayColumn({ day, startMin, endMin, rowHeight, totalH, nowMins, onCreateIn, onEditBlock, onEditEvent, onOpenDay }: DayColumnProps) {
  const laid = useMemo(() => {
    const entries: { pos: Positioned; start: number; end: number }[] = [
      ...day.events.map((occ) => ({ pos: { kind: 'event', occ } as Positioned, start: mm(occ.start), end: mm(occ.end) })),
      ...day.blocks.map((b) => ({ pos: { kind: 'block', block: b } as Positioned, start: mm(b.start), end: mm(b.end) })),
    ]
    return packOverlaps(entries)
  }, [day])

  const hourLines: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(to bottom, #e2e8f0 0px, #e2e8f0 1px, transparent 1px, transparent ${rowHeight}px)`,
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => onOpenDay?.(day.date)}
        className="flex h-10 w-full items-center justify-center gap-1.5 border-b border-slate-200 transition hover:bg-slate-50"
        title="查看这一天的日计划"
      >
        <span className="text-[11px] text-slate-400">周{weekdayLabel(day.weekday)}</span>
        <span className={`text-sm font-semibold tabular-nums ${day.isToday ? 'rounded-md bg-indigo-600 px-1.5 py-0.5 text-white' : 'text-slate-700'}`}>
          {shortDate(day.date)}
        </span>
      </button>
      <div className="relative flex-1" style={{ height: totalH, ...hourLines }}>
        {/* 空闲时段（管理员可点击安排，游客仅展示） */}
        {day.free.map((f) => {
          const top = ((mm(f.start) - startMin) / 60) * rowHeight
          const h = Math.max(14, ((mm(f.end) - mm(f.start)) / 60) * rowHeight - 2)
          const cls = `group absolute inset-x-1 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 ${
            onCreateIn ? 'cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50/80' : ''
          }`
          const style = { top: top + 1, height: h }
          const label = (
            <>
              {h > 44 && (
                <span className="pointer-events-none absolute inset-x-0 top-1.5 text-center text-[11px] tabular-nums text-slate-400 opacity-70 group-hover:opacity-100">
                  {f.start}–{f.end}
                </span>
              )}
              {h > 72 && onCreateIn && (
                <span className="pointer-events-none absolute inset-0 m-auto flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow-sm ring-1 ring-slate-200 transition-opacity group-hover:opacity-100">
                  ＋
                </span>
              )}
            </>
          )
          return onCreateIn ? (
            <button
              key={`free-${f.start}`}
              type="button"
              onClick={() => onCreateIn(day.date, mm(f.start), mm(f.end))}
              title={`空闲 ${f.start}–${f.end}，点击安排`}
              className={cls}
              style={style}
            >
              {label}
            </button>
          ) : (
            <div key={`free-${f.start}`} className={cls} style={style} title={`空闲 ${f.start}–${f.end}`}>
              {label}
            </div>
          )
        })}

        {/* 固定事件与已安排活动 */}
        {laid.map((item) => {
          const s = Math.max(item.start, startMin)
          const e = Math.min(item.end, endMin)
          const top = ((s - startMin) / 60) * rowHeight
          const h = Math.max(18, ((e - s) / 60) * rowHeight - 2)
          const width = 100 / item.cols
          const isEvent = item.kind === 'event'
          const meta = isEvent ? EVENT_CATEGORIES[item.occ.category] : BLOCK_CATEGORIES[item.block.category]
          const title = isEvent ? item.occ.title : item.block.title || meta.label
          const t0 = isEvent ? item.occ.start : item.block.start
          const t1 = isEvent ? item.occ.end : item.block.end
          const key = isEvent ? `ev-${item.occ.eventId}` : `bk-${item.block.id}`
          const onClick = isEvent ? onEditEvent && (() => onEditEvent(item.occ)) : onEditBlock && (() => onEditBlock(item.block))
          return (
            <div
              key={key}
              role={onClick ? 'button' : undefined}
              tabIndex={onClick ? 0 : undefined}
              onClick={onClick}
              onKeyDown={(ev) => {
                if (onClick && ev.key === 'Enter') onClick()
              }}
              title={`${title} ${t0}–${t1}${onClick ? `（点击${isEvent ? '编辑事件' : '编辑安排'}）` : ''}`}
              className={`absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 shadow-sm ${
                onClick ? 'cursor-pointer transition hover:brightness-95' : 'cursor-default'
              } ${isEvent ? meta.solid : meta.soft}`}
              style={{
                top: top + 1,
                height: h,
                left: `calc(${item.col * width}% + 3px)`,
                width: `calc(${width}% - 6px)`,
              }}
            >
              <div className="truncate text-[11px] font-medium leading-tight">{title}</div>
              {h >= 40 && <div className="truncate text-[10px] leading-tight opacity-75 tabular-nums">{t0}–{t1}</div>}
            </div>
          )
        })}

        {/* 当前时间指示线 */}
        {day.isToday && nowMins !== null && (
          <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ((nowMins - startMin) / 60) * rowHeight }}>
            <div className="flex items-center">
              <span className="-ml-1 h-2 w-2 rounded-full bg-rose-500" />
              <span className="h-px flex-1 bg-rose-500/70" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
