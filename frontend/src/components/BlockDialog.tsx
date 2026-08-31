import { useEffect, useState } from 'react'
import type { Block, BlockCategory, PendingTicket } from '../types'
import { BLOCK_CATEGORIES, BLOCK_CATEGORY_KEYS } from '../constants'
import { api } from '../api'
import { mm } from '../util'
import { ErrorText, Field, Modal, btnDangerGhost, btnGhost, btnPrimary, inputCls } from './ui'

interface Props {
  /** 编辑时传入已有安排；新建时传入预填的日期与时段 */
  initial: { block?: Block; date?: string; start?: string; end?: string }
  /** 已配置工单系统集成时，展示“从工单导入”选择器 */
  ticketsEnabled?: boolean
  onClose: () => void
  onSave: (values: Omit<Block, 'id'>) => Promise<void>
  onDelete?: () => void
}

export default function BlockDialog({ initial, ticketsEnabled = false, onClose, onSave, onDelete }: Props) {
  const b = initial.block
  const [title, setTitle] = useState(b?.title ?? '')
  const [category, setCategory] = useState<BlockCategory>(b?.category ?? 'work')
  const [date, setDate] = useState(b?.date ?? initial.date ?? '')
  const [start, setStart] = useState(b?.start ?? initial.start ?? '09:00')
  const [end, setEnd] = useState(b?.end ?? initial.end ?? '10:00')
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [tickets, setTickets] = useState<PendingTicket[] | null>(null)
  const [ticketErr, setTicketErr] = useState('')
  const [ticketSel, setTicketSel] = useState('')

  useEffect(() => {
    if (!ticketsEnabled) return
    let alive = true
    api
      .ticketsPending()
      .then((r) => {
        if (alive) setTickets(r.items)
      })
      .catch((e) => {
        if (alive) setTicketErr(e instanceof Error ? e.message : String(e))
      })
    return () => {
      alive = false
    }
  }, [ticketsEnabled])

  const pickTicket = (v: string) => {
    setTicketSel(v)
    const t = tickets?.find((x) => String(x.id) === v)
    if (!t) return
    setTitle(t.content)
    setNotes((prev) => (prev ? prev : `工单 #${t.id} · ${t.category}${t.creator ? ` · ${t.creator}` : ''}`))
  }

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
        {ticketsEnabled && (
          <Field label="从工单导入" hint={ticketErr ? `工单列表获取失败：${ticketErr}` : undefined}>
            <select className={inputCls} value={ticketSel} onChange={(e) => pickTicket(e.target.value)}>
              <option value="">
                {tickets === null
                  ? ticketErr
                    ? '获取工单列表失败'
                    : '加载工单中…'
                  : tickets.length > 0
                    ? '— 选择待处理工单，自动填入名称 —'
                    : 'tix 暂无待处理工单'}
              </option>
              {(tickets ?? []).map((t) => (
                <option key={t.id} value={String(t.id)}>
                  #{t.id} [{t.category}] {t.content}（{t.creator}）
                </option>
              ))}
            </select>
          </Field>
        )}

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
