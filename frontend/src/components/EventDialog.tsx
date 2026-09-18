import { useState } from 'react'
import type { EventCategory, RecurEvent } from '../types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_KEYS, WEEKDAY_LABELS } from '../constants'
import { mm } from '../util'
import { ErrorText, Field, Modal, btnDangerGhost, btnGhost, btnPrimary, inputCls } from './ui'

interface Props {
  initial?: RecurEvent | null
  onClose: () => void
  onSave: (values: Omit<RecurEvent, 'id'>) => Promise<void>
  onDelete?: () => void
}

export default function EventDialog({ initial, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<EventCategory>(initial?.category ?? 'meeting')
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 2, 3, 4, 5])
  const [start, setStart] = useState(initial?.start ?? '09:00')
  const [end, setEnd] = useState(initial?.end ?? '10:00')
  const [from, setFrom] = useState(initial?.from ?? '')
  const [to, setTo] = useState(initial?.to ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const toggleDay = (w: number) =>
    setWeekdays((ws) => (ws.includes(w) ? ws.filter((x) => x !== w) : [...ws, w].sort((a, b) => a - b)))

  const submit = async () => {
    if (!title.trim()) {
      setError('请填写事件名称')
      return
    }
    if (weekdays.length === 0) {
      setError('请至少选择一个重复的星期')
      return
    }
    if (mm(start) >= mm(end)) {
      setError('开始时间必须早于结束时间')
      return
    }
    if (from && to && from > to) {
      setError('生效开始日期不能晚于结束日期')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ title, category, weekdays, start, end, from, to, notes, enabled })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Modal title={initial ? '编辑周期事件' : '新增周期事件'} onClose={onClose} width="max-w-lg">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label="名称">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：团队例会、英语课"
            autoFocus
          />
        </Field>

        <Field label="分类">
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORY_KEYS.map((key) => {
              const on = category === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`anim-press cursor-pointer rounded-full px-3.5 py-1.5 text-[13.5px] transition duration-200 ease-quart active:scale-[0.97] ${
                    on
                      ? 'bg-accent font-semibold text-white shadow-[0_1px_2px_rgba(0,113,227,0.24)]'
                      : 'bg-black/[0.05] font-medium text-ink-2 hover:bg-black/[0.08] hover:text-ink'
                  }`}
                >
                  {EVENT_CATEGORIES[key].label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="每周重复">
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, i) => {
              const w = i + 1
              const on = weekdays.includes(w)
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleDay(w)}
                  className={`anim-press h-9 w-9 cursor-pointer rounded-full text-[13.5px] font-medium transition duration-200 ease-quart active:scale-[0.94] ${
                    on
                      ? 'bg-accent font-semibold text-white'
                      : 'bg-black/[0.05] text-ink-2 hover:bg-black/[0.08] hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="开始时间">
            <input type="time" step={300} className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="结束时间">
            <input type="time" step={300} className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="生效开始日期" hint="留空表示长期有效">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="生效结束日期" hint="留空表示长期有效">
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        <Field label="备注（可选）">
          <textarea className={`${inputCls} h-[68px] resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <label className="-my-2 flex cursor-pointer items-center gap-3 py-2 text-[13.5px] text-ink">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="peer sr-only" />
          <span
            className={`relative block h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200 ease-quart ${
              enabled ? 'bg-[#30d158]' : 'bg-track'
            }`}
          >
            <span
              className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] duration-200 ease-quart ${
                enabled ? 'left-[21px]' : 'left-[3px]'
              }`}
            />
          </span>
          启用（停用后不再计入时间表）
        </label>

        <ErrorText text={error} />

        <div className="flex items-center gap-2">
          {onDelete && (
            <button type="button" onClick={onDelete} className={btnDangerGhost}>
              删除
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className={btnGhost}>
            取消
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            保存
          </button>
        </div>
      </form>
    </Modal>
  )
}
