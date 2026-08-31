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
  const ring = `conic-gradient(#94a3b8 0% ${fixedPct}%, #6366f1 ${fixedPct}% ${fixedPct + plannedPct}%, #34d399 ${fixedPct + plannedPct}% 100%)`

  return (
    <div className="flex items-start gap-5">
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{dateLabel(day.date)}</h2>
            {day.isToday && (
              <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-700">今天</span>
            )}
          </div>
          <WeekGrid days={[day]} settings={settings} rowHeight={64} onCreateIn={onCreateIn} onEditBlock={onEditBlock} onEditEvent={onEditEvent} />
        </div>
      </div>

      <aside className="w-80 shrink-0 space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">今日统计</h3>
          <div className="mb-3 flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <div className="h-full w-full rounded-full" style={{ background: ring }} />
              <div className="absolute inset-[11px] flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-xs font-bold tabular-nums text-slate-900">{fmtDur(stats.freeMin)}</span>
                <span className="mt-0.5 text-[10px] text-slate-400">空闲</span>
              </div>
            </div>
            <div className="grid flex-1 gap-2">
              <LegendRow dot="bg-slate-400" label="固定安排" value={fmtDur(stats.fixedMin)} />
              <LegendRow dot="bg-brand-500" label="已计划" value={fmtDur(stats.plannedMin)} />
              <LegendRow dot="bg-emerald-400" label="空闲" value={fmtDur(stats.freeMin)} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
          <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-900">
            空闲时段
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{day.free.length}</span>
          </h3>
          {day.free.length === 0 ? (
            <p className="text-sm text-slate-400">今天没有空闲时段。</p>
          ) : (
            <ul className="space-y-2">
              {day.free.map((f) => {
                const inner = (
                  <>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium tabular-nums text-slate-700">
                        {f.start} – {f.end}
                      </span>
                      <span className="block text-xs text-slate-400">{fmtDur(f.minutes)}</span>
                    </span>
                    {editable && (
                      <span className="shrink-0 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">安排 →</span>
                    )}
                  </>
                )
                const cls = `group flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-left transition ${
                  editable ? 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/70' : 'border-slate-200 bg-slate-50/50'
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
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-200/80">
          <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-900">
            已计划活动
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{day.blocks.length}</span>
          </h3>
          {day.blocks.length === 0 ? (
            <p className="text-sm text-slate-400">还没有安排，点击左侧空闲时段添加。</p>
          ) : (
            <ul className="space-y-1">
              {day.blocks.map((b) => {
                const inner = (
                  <>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${BLOCK_CATEGORIES[b.category].dot}`} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{b.title || BLOCK_CATEGORIES[b.category].label}</span>
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

function LegendRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-800">{value}</span>
    </div>
  )
}
