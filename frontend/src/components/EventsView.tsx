import type { RecurEvent } from '../types'
import { EVENT_CATEGORIES, weekdayLabel } from '../constants'
import { fmtDur, mm } from '../util'
import { btnPrimary } from './ui'

interface Props {
  events: RecurEvent[] | null
  /** false=游客只读：不显示新增/编辑/删除/启停 */
  editable?: boolean
  onAdd: () => void
  onEdit: (e: RecurEvent) => void
  onToggle: (e: RecurEvent) => void
  onDelete: (e: RecurEvent) => void
}

function repeatLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return '每天'
  return `每${weekdays.map((w) => `周${weekdayLabel(w)}`).join('、')}`
}

export default function EventsView({ events, editable = true, onAdd, onEdit, onToggle, onDelete }: Props) {
  // 启用中的事件每周固定占用时长
  const weeklyMin = events
    ? events.filter((e) => e.enabled).reduce((acc, e) => acc + (mm(e.end) - mm(e.start)) * e.weekdays.length, 0)
    : 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">周期事件</h2>
          <p className="mt-0.5 text-sm text-slate-500">例会、课程这类固定日程录入一次，系统会自动排入每周时间表，并扣除对应空闲时段。</p>
        </div>
        {editable && (
          <button type="button" onClick={onAdd} className={`${btnPrimary} shrink-0`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
            新增事件
          </button>
        )}
      </div>

      {events === null ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-xs ring-1 ring-slate-200/80">加载中…</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-12 text-center">
          <svg width="140" height="96" viewBox="0 0 140 96" fill="none" className="mx-auto" aria-hidden>
            <rect x="20" y="6" width="100" height="84" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
            <path d="M20 18v-.5A11.5 11.5 0 0 1 31.5 6h77A11.5 11.5 0 0 1 120 17.5v.5H20Z" fill="#e0e7ff" />
            <circle cx="36" cy="16" r="3" fill="#818cf8" />
            <circle cx="70" cy="16" r="3" fill="#c7d2fe" />
            <circle cx="104" cy="16" r="3" fill="#c7d2fe" />
            <rect x="32" y="34" width="52" height="10" rx="5" fill="#dbeafe" />
            <rect x="32" y="34" width="4" height="10" rx="2" fill="#3b82f6" />
            <rect x="32" y="50" width="40" height="10" rx="5" fill="#ede9fe" />
            <rect x="32" y="50" width="4" height="10" rx="2" fill="#8b5cf6" />
            <rect x="32" y="66" width="46" height="10" rx="5" fill="#d1fae5" />
            <rect x="32" y="66" width="4" height="10" rx="2" fill="#10b981" />
            <circle cx="118" cy="80" r="13" fill="#4f46e5" />
            <path d="M118 74.5v11M112.5 80h11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="mt-4 text-sm font-medium text-slate-700">还没有周期事件</p>
          <p className="mt-1 text-sm text-slate-400">添加你的课程、例会等固定安排后，这里会自动生成每周时间表。</p>
          {editable && (
            <button type="button" onClick={onAdd} className={`mt-4 ${btnPrimary}`}>
              添加第一个事件
            </button>
          )}
        </div>
      ) : (
        <div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80">
            {events.map((ev) => {
              const meta = EVENT_CATEGORIES[ev.category]
              return (
                <li key={ev.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm font-medium ${ev.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {ev.title}
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${meta.chip}`}>{meta.label}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {repeatLabel(ev.weekdays)} · {ev.start}–{ev.end}
                      {(ev.from || ev.to) && ` · ${ev.from || '…'} ~ ${ev.to || '长期'}`}
                      {ev.notes && ` · ${ev.notes}`}
                    </div>
                  </div>
                  {editable && (
                    <>
                      <Toggle on={ev.enabled} onClick={() => onToggle(ev)} />
                      <button
                        type="button"
                        onClick={() => onEdit(ev)}
                        className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(ev)}
                        className="rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        删除
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 px-1 text-xs text-slate-400">
            共 {events.length} 个周期事件 · 启用中的每周固定占用约 {fmtDur(weeklyMin)}
          </p>
        </div>
      )}
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      title={on ? '点击停用' : '点击启用'}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}
