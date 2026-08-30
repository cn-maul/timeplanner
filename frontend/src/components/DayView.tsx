import type { Block, DayData, Occurrence, Settings } from '../types'
import { BLOCK_CATEGORIES } from '../constants'
import { fmtDur, mm } from '../util'
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
    <div className="flex items-start gap-5">
      <div className="min-w-0 flex-1">
        <WeekGrid days={[day]} settings={settings} rowHeight={64} onCreateIn={onCreateIn} onEditBlock={onEditBlock} onEditEvent={onEditEvent} />
      </div>

      <aside className="w-80 shrink-0 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">今日统计</h3>
          <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-slate-400" style={{ width: `${fixedPct}%` }} />
            <div className="bg-indigo-500" style={{ width: `${plannedPct}%` }} />
            <div className="bg-emerald-400" style={{ width: `${Math.max(0, 100 - fixedPct - plannedPct)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="固定安排" value={fmtDur(stats.fixedMin)} />
            <Stat label="已计划" value={fmtDur(stats.plannedMin)} />
            <Stat label="空闲" value={fmtDur(stats.freeMin)} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">空闲时段</h3>
          {day.free.length === 0 ? (
            <p className="text-sm text-slate-400">今天没有空闲时段。</p>
          ) : (
            <ul className="space-y-2">
              {day.free.map((f) => (
                <li key={f.start} className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium tabular-nums text-slate-700">
                      {f.start} – {f.end}
                    </div>
                    <div className="text-xs text-slate-400">{fmtDur(f.minutes)}</div>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => onCreateIn(day.date, mm(f.start), mm(f.end))}
                      className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-indigo-500"
                    >
                      安排
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">已计划活动</h3>
          {day.blocks.length === 0 ? (
            <p className="text-sm text-slate-400">还没有安排，点击左侧空闲时段添加。</p>
          ) : (
            <ul className="space-y-1">
              {day.blocks.map((b) => {
                const inner = (
                  <>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${BLOCK_CATEGORIES[b.category].dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.title}</span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {b.start}–{b.end}
                    </span>
                  </>
                )
                const cls = 'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left'
                return (
                  <li key={b.id}>
                    {editable ? (
                      <button type="button" onClick={() => onEditBlock(b)} className={`${cls} transition hover:bg-slate-50`}>
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
        </section>
      </aside>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular-nums text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}
