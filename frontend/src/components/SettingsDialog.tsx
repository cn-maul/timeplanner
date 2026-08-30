import { useState } from 'react'
import type { Settings } from '../types'
import { mm } from '../util'
import { ErrorText, Field, Modal, inputCls } from './ui'

function buildOptions(fromMin: number, toMin: number): string[] {
  const out: string[] = []
  for (let m = fromMin; m <= toMin; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

const START_OPTIONS = buildOptions(5 * 60, 23 * 60 + 30)
const END_OPTIONS = buildOptions(12 * 60, 24 * 60)

interface Props {
  initial: Settings
  onClose: () => void
  onSave: (s: Settings) => Promise<void>
}

export default function SettingsDialog({ initial, onClose, onSave }: Props) {
  const [dayStart, setDayStart] = useState(initial.dayStart)
  const [dayEnd, setDayEnd] = useState(initial.dayEnd)
  const [error, setError] = useState('')

  const submit = async () => {
    if (mm(dayStart) >= mm(dayEnd)) {
      setError('开始时间必须早于结束时间')
      return
    }
    try {
      await onSave({ dayStart, dayEnd })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Modal title="设置 · 每日规划时段" onClose={onClose} width="max-w-sm">
      <p className="mb-4 text-sm text-slate-500">时间表与空闲时段统计将限定在该时段内，时段外的活动仍会显示在时间轴上。</p>
      <div className="space-y-4">
        <Field label="每天从">
          <select className={inputCls} value={dayStart} onChange={(e) => setDayStart(e.target.value)}>
            {START_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="每天到">
          <select className={inputCls} value={dayEnd} onChange={(e) => setDayEnd(e.target.value)}>
            {END_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <ErrorText text={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100">
            取消
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            保存
          </button>
        </div>
      </div>
    </Modal>
  )
}
