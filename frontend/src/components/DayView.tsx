import type { Block, DayData, Occurrence, Settings } from '../types'
import { BLOCK_CATEGORIES } from '../constants'
import { dateLabel, fmtDur, mm } from '../util'
import WeekGrid from './WeekGrid'

interface Props {
  day: DayData
  settings: Settings
  /** false=游客只读：不显示“安排”按钮，活动列表不可点击 */
  editable?: boolean
  onCreateIn: (date: string, start: number, end: number) => void
  onEditBlock: (b: Block) => void
  onEditEvent: (occ: Occurrence) => void
}

export default function DayView({ day, settings, editable = true, onCreateIn, onEditBlock, onEditEvent }: Props) {
  const { stats } = day
  const total = Math.max(1, mm(settings.dayEnd) - mm(settings.dayStart))
  const fixedPct = (stats.fixedMin / total) * 100
  const plannedPct = (stats.plannedMin / total) * 100

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col items-start gap-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] text-ink">{dateLabel(day.date)}</h2>
            {day.isToday && <span className="text-[13px] font-medium text-accent">今天</span>}
          </div>
          <WeekGrid days={[day]} settings={settings} rowHeight={64} onCreateIn={onCreateIn} onEditBlock={onEditBlock} onEditEvent={onEditEvent} />
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[300px]">
        <Panel title="今日时间分配">
          <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-track">
            {stats.fixedMin > 0 && <div className="bg-[#aeaeb2]" style={{ width: `${fixedPct}%` }} />}
            {stats.plannedMin > 0 && <div className="bg-accent" style={{ width: `${plannedPct}%` }} />}
            {stats.freeMin > 0 && <div className="min-w-1 flex-1 bg-[#30d158]" />}
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5">
            <LegendRow color="#aeaeb2" label="固定安排" value={fmtDur(stats.fixedMin)} />
            <LegendRow color="#0071e3" label="已计划" value={fmtDur(stats.plannedMin)} />
            <LegendRow color="#30d158" label="空闲" value={fmtDur(stats.freeMin)} />
          </div>
        </Panel>

        <Panel title="空闲时段" count={day.free.length}>
          {day.free.length === 0 ? (
            <p className="py-1 text-[13px] text-ink-3">今天没有空闲时段。</p>
          ) : (
            <ul className="-mx-2">
              {day.free.map((f) => {
                const inner = (
                  <>
                    <span className="min-w-0">
                      <span className="tnum block text-[14px] font-medium text-ink">
                        {f.start} – {f.end}
                      </span>
                      <span className="tnum block text-[12px] text-ink-3">{fmtDur(f.minutes)}</span>
                    </span>
                    {editable && (
                      <span className="shrink-0 text-[12.5px] font-medium text-accent opacity-0 transition-opacity duration-200 ease-quart group-hover:opacity-100">
                        安排 →
                      </span>
                    )}
                  </>
                )
                const cls = `group flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-2 text-left transition duration-200 ease-quart ${
                  editable ? 'cursor-pointer hover:bg-accent/[0.06]' : ''
                }`
                return (
                  <li key={f.start}>
                    {editable ? (
                      <button type="button" onClick={() => onCreateIn(day.date, mm(f.start), mm(f.end))} className={cls} title="点击安排这个时段">
                        {inner}
                      </button>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="已计划活动" count={day.blocks.length}>
          {day.blocks.length === 0 ? (
            <p className="py-1 text-[13px] leading-[1.6] text-ink-3">还没有安排，点击左侧空闲时段添加。</p>
          ) : (
            <ul className="-mx-2">
              {day.blocks.map((b) => {
                const inner = (
                  <>
                    <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: BLOCK_CATEGORIES[b.category].dot }} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{b.title || BLOCK_CATEGORIES[b.category].label}</span>
                    <span className="tnum shrink-0 text-[12px] text-ink-3">
                      {b.start}–{b.end}
                    </span>
                  </>
                )
                const cls = 'flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left transition duration-200 ease-quart'
                return (
                  <li key={b.id}>
                    {editable ? (
                      <button type="button" onClick={() => onEditBlock(b)} className={`${cls} cursor-pointer hover:bg-hov`}>
                        {inner}
                      </button>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  )
}

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-panel bg-surface p-4 shadow-card">
      <h3 className="mb-3 flex items-baseline justify-between gap-2 text-[13px] font-semibold tracking-[-0.005em] text-ink">
        {title}
        {count !== undefined && <span className="tnum text-[12px] font-normal text-ink-3">{count} 段</span>}
      </h3>
      {children}
    </section>
  )
}

function LegendRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-[13px] text-ink-2">
        <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tnum text-[13.5px] font-semibold text-ink">{value}</span>
    </div>
  )
}
