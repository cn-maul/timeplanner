import { useState } from 'react'
import type { Block, BlockCategory } from '../types'
import { BLOCK_CATEGORIES, BLOCK_CATEGORY_KEYS } from '../constants'
import { mm } from '../util'
import { ErrorText, Field, Modal, inputCls } from './ui'

interface Props {
  /** 编辑时传入已有安排；新建时传入预填的日期与时段 */
  initial: { block?: Block; date?: string; start?: string; end?: string }
  onClose: () => void
  onSave: (values: Omit<Block, 'id'>) => Promise<void>
  onDelete?: () => Promise<void>
}

export default function BlockDialog({ initial, onClose, onSave, onDelete }: Props) {
  const b = initial.block
  const [title, setTitle] = useState(b?.title ?? '')
  const [category, setCategory] = useState<BlockCategory>(b?.category ?? 'work')
  const [date, setDate] = useState(b?.date ?? initial.date ?? '')
  const [start, setStart] = useState(b?.start ?? initial.start ?? '09:00')
  const [end, setEnd] = useState(b?.end ?? initial.end ?? '10:00')
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!date) {
      setError('请选择日期')
      return
    }
    if (mm(start) >= mm(end)) {
      setError('开始时间必须早于结束时间')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ title, category, date, start, end, notes })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Modal title={b ? '编辑安排' : '添加安排'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Field label="名称" hint="留空时显示分类名称">
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`如：${BLOCK_CATEGORIES[category].label} · 写报告`}
            autoFocus
          />
        </Field>

        <Field label="分类">
          <div className="flex flex-wrap gap-2">
            {BLOCK_CATEGORY_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  category === key ? BLOCK_CATEGORIES[key].chip : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {BLOCK_CATEGORIES[key].label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="日期">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="开始">
            <input type="time" step={300} className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="结束">
            <input type="time" step={300} className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="备注（可选）">
          <textarea className={`${inputCls} h-16 resize-none`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </Modal>
  )
}
