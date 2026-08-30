import type { RecurEvent } from '../types'
import { EVENT_CATEGORIES, weekdayLabel } from '../constants'

interface Props {
  events: RecurEvent[] | null
  onAdd: () => void
  onEdit: (e: RecurEvent) => void
  onToggle: (e: RecurEvent) => void
  onDelete: (e: RecurEvent) => void
}

function repeatLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return '每天'
  return `每${weekdays.map((w) => `周${weekdayLabel(w)}`).join('、')}`
}

export default function EventsView({ events, onAdd, onEdit, onToggle, onDelete }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">周期事件</h2>
          <p className="mt-0.5 text-sm text-slate-500">例会、课程、健身这类固定日程录入一次，系统会自动排入每周时间表，并扣除对应空闲时段。</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          ＋ 新增事件
        </button>
      </div>

      {events === null ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">加载中…</div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="text-3xl">🗓️</div>
          <p className="mt-3 text-sm font-medium text-slate-700">还没有周期事件</p>
          <p className="mt-1 text-sm text-slate-400">添加你的课程、例会、健身等固定安排后，这里会自动生成每周时间表。</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            添加第一个事件
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {events.map((ev) => {
            const meta = EVENT_CATEGORIES[ev.category]
            return (
              <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm font-medium ${ev.enabled ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{ev.title}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${meta.chip}`}>{meta.label}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {repeatLabel(ev.weekdays)} · {ev.start}–{ev.end}
                    {(ev.from || ev.to) && ` · ${ev.from || '…'} ~ ${ev.to || '长期'}`}
                    {ev.notes && ` · ${ev.notes}`}
                  </div>
                </div>
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
                  className="rounded-lg px-2 py-1.5 text-sm text-rose-500 transition hover:bg-rose-50"
                >
                  删除
                </button>
              </li>
            )
          })}
        </ul>
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
