import { useMemo, type CSSProperties } from 'react'
import type { Block, DayData, Occurrence, Settings } from '../types'
import { BLOCK_CATEGORIES, EVENT_CATEGORIES, weekdayLabel } from '../constants'
import { hhmm, mm, shortDate } from '../util'

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
  const headerH = days.length === 1 ? 30 : 44

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
    // 窄屏不压窄列：保持每列最小可读宽度，整块横向滚动
    <div className="overflow-x-auto">
      <div className="flex min-w-[680px] overflow-hidden rounded-card bg-surface shadow-card md:min-w-0">
        {/* 时间刻度列 */}
        <div className="w-14 shrink-0">
          <div style={{ height: headerH }} />
          <div className="relative mr-2.5 border-r border-hairline" style={{ height: totalH }}>
            {labelHours.map((h) => (
              <div
                key={h}
                className="tnum absolute right-2 -translate-y-1/2 text-[11.5px] text-ink-3"
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
            headerH={headerH}
            nowMins={nowMins}
            onCreateIn={onCreateIn}
            onEditBlock={onEditBlock}
            onEditEvent={onEditEvent}
            onOpenDay={onOpenDay}
          />
        ))}
      </div>
    </div>
  )
}

interface DayColumnProps {
  day: DayData
  startMin: number
  endMin: number
  rowHeight: number
  totalH: number
  headerH: number
  nowMins: number | null
  onCreateIn?: Props['onCreateIn']
  onEditBlock?: Props['onEditBlock']
  onEditEvent?: Props['onEditEvent']
  onOpenDay?: Props['onOpenDay']
}

function DayColumn({ day, startMin, endMin, rowHeight, totalH, headerH, nowMins, onCreateIn, onEditBlock, onEditEvent, onOpenDay }: DayColumnProps) {
  const laid = useMemo(() => {
    const entries: { pos: Positioned; start: number; end: number }[] = [
      ...day.events.map((occ) => ({ pos: { kind: 'event', occ } as Positioned, start: mm(occ.start), end: mm(occ.end) })),
      ...day.blocks.map((b) => ({ pos: { kind: 'block', block: b } as Positioned, start: mm(b.start), end: mm(b.end) })),
    ]
    return packOverlaps(entries)
  }, [day])

  // 小时线用 4% 黑（≈#f5f5f5），在灰底与白底上都成立
  const hourLines: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent ${rowHeight}px)`,
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col border-l border-hairline">
      {/* 日期表头：整列可点，进入日计划 */}
      <button
        type="button"
        onClick={() => onOpenDay?.(day.date)}
        style={{ height: headerH }}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors duration-200 ease-quart hover:bg-hov"
        title="查看这一天的日计划"
      >
        <span className="text-[11px] leading-none text-ink-3">周{weekdayLabel(day.weekday)}</span>
        <span
          className={
            day.isToday
              ? 'tnum text-[13.5px] font-semibold leading-none text-white'
              : 'tnum text-[15px] font-semibold leading-none tracking-[-0.01em] text-ink'
          }
        >
          {day.isToday ? <span className="rounded-full bg-accent px-2 py-1">{shortDate(day.date)}</span> : shortDate(day.date)}
        </span>
      </button>

      <div className="relative flex-1" style={{ height: totalH, ...hourLines }}>
        {/* 空闲时段：平时只是留白，悬停才浮现可点状态 */}
        {day.free.map((f) => {
          const top = ((mm(f.start) - startMin) / 60) * rowHeight
          const h = Math.max(14, ((mm(f.end) - mm(f.start)) / 60) * rowHeight - 2)
          const cls = `group absolute inset-x-1 rounded-[6px] border border-dashed ${
            onCreateIn
              ? 'cursor-pointer border-transparent transition-colors duration-200 ease-quart hover:border-accent/40 hover:bg-accent/[0.05]'
              : 'border-black/[0.05]'
          }`
          const style = { top: top + 1, height: h }
          const label = (
            <>
              {h > 44 && (
                <span
                  className={`tnum pointer-events-none absolute inset-x-0 top-1.5 text-center text-[11px] transition-colors duration-200 ease-quart ${
                    onCreateIn ? 'text-ink-4 group-hover:text-accent' : 'text-ink-4'
                  }`}
                >
                  {f.start}–{f.end}
                </span>
              )}
              {h > 72 && onCreateIn && (
                <span className="pointer-events-none absolute inset-0 m-auto flex h-6 w-6 scale-90 items-center justify-center rounded-full bg-white text-accent opacity-0 shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition duration-200 ease-quart group-hover:scale-100 group-hover:opacity-100">
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
              className={`absolute z-10 overflow-hidden rounded-[6px] px-2 py-[3px] transition duration-200 ease-quart ${
                onClick ? 'cursor-pointer hover:-translate-y-px hover:shadow-card' : 'cursor-default'
              } ${meta.cell}`}
              style={{
                top: top + 1,
                height: h,
                left: `calc(${item.col * width}% + 3px)`,
                width: `calc(${width}% - 6px)`,
                borderLeft: `3px solid ${meta.bar}`,
              }}
            >
              <div className="truncate text-[11.5px] font-semibold leading-tight">{title}</div>
              {h >= 40 && <div className="tnum truncate text-[10.5px] leading-tight text-ink-3">{t0}–{t1}</div>}
            </div>
          )
        })}

        {/* 当前时间线 */}
        {day.isToday && nowMins !== null && (
          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMins - startMin) / 60) * rowHeight }}>
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" style={{ animation: 'now-pulse 2s ease-in-out infinite' }} />
            <span className="h-px flex-1 bg-accent/50" />
            <span className="tnum shrink-0 rounded-full bg-accent px-1.5 py-px text-[9.5px] font-semibold leading-[13px] text-white">
              {hhmm(nowMins)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
