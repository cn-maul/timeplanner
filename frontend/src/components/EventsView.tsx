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
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-[28px] font-bold tracking-[-0.025em] text-ink">周期事件</h2>
          <p className="mt-1.5 max-w-[520px] text-[15px] leading-[1.7] text-ink-2">
            例会、课程这类固定日程录入一次，系统会自动排入每周时间表，并从空闲时段中扣除。
          </p>
        </div>
        {editable && (
          <button type="button" onClick={onAdd} className={`${btnPrimary} h-11 shrink-0 px-4`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
            新增事件
          </button>
        )}
      </div>

      {events === null ? (
        <div className="rounded-panel bg-surface p-10 text-center text-[13px] text-ink-3 shadow-card">加载中…</div>
      ) : events.length === 0 ? (
        <EmptyState editable={editable} onAdd={onAdd} />
      ) : (
        <div>
          <ul className="overflow-hidden rounded-panel bg-surface shadow-card">
            {events.map((ev, i) => {
              const meta = EVENT_CATEGORIES[ev.category]
              return (
                <li
                  key={ev.id}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-200 ease-quart hover:bg-hov ${
                    i > 0 ? 'border-t border-hairline' : ''
                  }`}
                >
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.dot }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-[14.5px] font-medium ${ev.enabled ? 'text-ink' : 'text-ink-4 line-through'}`}>
                        {ev.title}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-[3px] text-[11px] font-medium ${meta.chip}`}>{meta.label}</span>
                    </div>
                    <div className="tnum mt-1 truncate text-[12.5px] text-ink-3">
                      {repeatLabel(ev.weekdays)} · {ev.start}–{ev.end}
                      {(ev.from || ev.to) && ` · ${ev.from || '长期'} ~ ${ev.to || '长期'}`}
                      {ev.notes && ` · ${ev.notes}`}
                    </div>
                  </div>
                  {editable && (
                    <>
                      <Toggle on={ev.enabled} onClick={() => onToggle(ev)} />
                      <button
                        type="button"
                        onClick={() => onEdit(ev)}
                        className="anim-press cursor-pointer rounded-full px-2.5 py-1.5 text-[13px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97]"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(ev)}
                        className="anim-press cursor-pointer rounded-full px-2.5 py-1.5 text-[13px] font-medium text-ink-3 transition duration-200 ease-quart hover:bg-[#ff3b30]/[0.07] hover:text-[#c4342b] active:scale-[0.97]"
                      >
                        删除
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="mt-3 px-1 text-[12px] text-ink-3">
            共 {events.length} 个周期事件 · 启用中的每周固定占用约 <span className="tnum">{fmtDur(weeklyMin)}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function EmptyState({ editable, onAdd }: { editable: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-panel bg-surface p-10 text-center shadow-card">
      <svg width="112" height="78" viewBox="0 0 140 96" fill="none" className="mx-auto" aria-hidden>
        <rect x="20" y="6" width="100" height="84" rx="12" fill="#ffffff" stroke="rgba(0,0,0,0.07)" strokeWidth="1.5" />
        <path d="M20 18v-.5A11.5 11.5 0 0 1 31.5 6h77A11.5 11.5 0 0 1 120 17.5v.5H20Z" fill="rgba(0,0,0,0.05)" />
        <circle cx="36" cy="16" r="3" fill="#d2d2d7" />
        <circle cx="70" cy="16" r="3" fill="#d2d2d7" />
        <circle cx="104" cy="16" r="3" fill="#d2d2d7" />
        <rect x="32" y="34" width="52" height="10" rx="5" fill="rgba(0,0,0,0.05)" />
        <rect x="32" y="34" width="3" height="10" rx="1.5" fill="#8e8e93" />
        <rect x="32" y="50" width="40" height="10" rx="5" fill="rgba(0,0,0,0.05)" />
        <rect x="32" y="50" width="3" height="10" rx="1.5" fill="#5e5ce6" />
        <rect x="32" y="66" width="46" height="10" rx="5" fill="rgba(0,0,0,0.05)" />
        <rect x="32" y="66" width="3" height="10" rx="1.5" fill="#ff9f0a" />
        <circle cx="118" cy="80" r="13" fill="#0071e3" />
        <path d="M118 74.5v11M112.5 80h11" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="mt-5 text-[15px] font-semibold tracking-[-0.01em] text-ink">还没有周期事件</p>
      <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-[1.7] text-ink-2">
        添加你的课程、例会等固定安排后，这里会自动生成每周时间表。
      </p>
      {editable && (
        <button type="button" onClick={onAdd} className={`${btnPrimary} mt-5`}>
          添加第一个事件
        </button>
      )}
    </div>
  )
}

/** iOS 风格开关：26px 视觉高度，44px 命中区由外层的 padding 提供 */
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      title={on ? '点击停用' : '点击启用'}
      className="-my-2.5 cursor-pointer py-2.5"
    >
      <span
        className={`relative block h-[26px] w-[44px] rounded-full transition-colors duration-200 ease-quart ${
          on ? 'bg-[#30d158]' : 'bg-track'
        }`}
      >
        <span
          className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-200 ease-quart ${
            on ? 'left-[21px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  )
}
