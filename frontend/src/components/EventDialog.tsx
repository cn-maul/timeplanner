import { useState } from 'react'
import type { EventCategory, RecurEvent } from '../types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_KEYS, WEEKDAY_LABELS } from '../constants'
import { mm } from '../util'
import { ErrorText, Field, Modal, inputCls } from './ui'

interface Props {
  initial?: RecurEvent | null
  onClose: () => void
  onSave: (values: Omit<RecurEvent, 'id'>) => Promise<void>
  onDelete?: () => Promise<void>
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
        className="space-y-4"
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
            placeholder="如：团队例会、英语课、健身"
            autoFocus
          />
        </Field>

        <Field label="分类">
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  category === key ? EVENT_CATEGORIES[key].chip : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {EVENT_CATEGORIES[key].label}
              </button>
            ))}
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
                  className={`h-9 w-9 rounded-full border text-sm transition ${
                    on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
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
          <textarea className={`${inputCls} h-16 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
          />
          启用（停用后不再计入时间表）
        </label>

        <ErrorText text={error} />

        <div className="flex items-center gap-2 pt-1">
          {onDelete && (
            <button type="button" onClick={() => void onDelete()} className="rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50">
              删除
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100">
            取消
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </Modal>
  )
}
