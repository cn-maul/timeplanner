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
          {/* 今日时间预算：固定/已计划/空闲 占比条（与周视图一致） */}
          <div className="flex h-2.5 gap-0.5">
            {stats.fixedMin > 0 && <div className="rounded-full bg-gradient-to-r from-slate-400 to-slate-300" style={{ width: `${fixedPct}%` }} />}
            {stats.plannedMin > 0 && <div className="rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${plannedPct}%` }} />}
            {stats.freeMin > 0 && <div className="min-w-2 flex-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />}
          </div>
          <div className="mt-3 space-y-1.5">
            <LegendRow dot="bg-slate-400" label="固定安排" value={fmtDur(stats.fixedMin)} />
            <LegendRow dot="bg-brand-500" label="已计划" value={fmtDur(stats.plannedMin)} />
            <LegendRow dot="bg-emerald-400" label="空闲" value={fmtDur(stats.freeMin)} />
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
