import { useState } from 'react'
import type { IntegrationUpdate, Settings } from '../types'
import type { SettingsInfo } from '../api'
import { api } from '../api'
import { mm } from '../util'
import { ErrorText, Field, Modal, btnGhost, btnOutline, btnPrimary, inputCls } from './ui'

function buildOptions(fromMin: number, toMin: number): string[] {
  const out: string[] = []
  for (let m = fromMin; m <= toMin; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

const START_OPTIONS = buildOptions(5 * 60, 23 * 60 + 30)
const END_OPTIONS = buildOptions(12 * 60, 24 * 60)

export type SettingsPayload = Settings & { integration?: IntegrationUpdate }

interface Props {
  initial: SettingsInfo
  onClose: () => void
  onSave: (s: SettingsPayload) => Promise<void>
}

export default function SettingsDialog({ initial, onClose, onSave }: Props) {
  const [dayStart, setDayStart] = useState(initial.dayStart)
  const [dayEnd, setDayEnd] = useState(initial.dayEnd)
  const [ticketUrl, setTicketUrl] = useState(initial.ticketUrl)
  const [ticketKey, setTicketKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [testOk, setTestOk] = useState<string>('')
  const [testErr, setTestErr] = useState<string>('')
  const [error, setError] = useState('')

  const submit = async () => {
    if (mm(dayStart) >= mm(dayEnd)) {
      setError('开始时间必须早于结束时间')
      return
    }
    const url = ticketUrl.trim()
    const integration: IntegrationUpdate = { ticketUrl: url }
    if (ticketKey) {
      integration.ticketKey = ticketKey
    } else if (!url && initial.ticketKeySet) {
      integration.ticketKey = '' // 清空地址时一并清除 Key
    }
    try {
      await onSave({ dayStart, dayEnd, integration })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestOk('')
    setTestErr('')
    try {
      const url = ticketUrl.trim()
      const form: IntegrationUpdate | undefined = url
        ? { ticketUrl: url, ...(ticketKey ? { ticketKey } : {}) }
        : undefined
      const r = await api.ticketsTest(form)
      setTestOk(`连接成功，当前待处理工单 ${r.pending} 条`)
    } catch (e) {
      setTestErr('连接失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal title="设置" onClose={onClose} width="max-w-md">
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">每日规划时段</h3>
          <p className="text-sm text-slate-500">时间表与空闲时段统计将限定在该时段内，时段外的活动仍会显示在时间轴上。</p>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900">工单系统集成（可选）</h3>
          <p className="text-sm text-slate-500">
            填写 tix 工单系统地址与 API Key 后，新建安排时可一键导入待处理工单。Key 在 tix 的「系统设置 → 通用设置」中生成。
          </p>
          <Field label="工单系统地址">
            <input
              className={inputCls}
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="http://192.168.1.10:8881"
            />
          </Field>
          <Field
            label="API Key"
            hint={initial.ticketKeySet ? '已设置；留空表示保持不变，清空地址时一并清除' : '在 tix 管理端生成后粘贴到这里'}
          >
            <input
              type="password"
              className={inputCls}
              value={ticketKey}
              onChange={(e) => setTicketKey(e.target.value)}
              placeholder={initial.ticketKeySet ? '••••••••' : '48 位十六进制 Key'}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void testConnection()} disabled={testing} className={btnOutline}>
              {testing ? '测试中…' : '测试连接'}
            </button>
            {testOk && <span className="text-sm text-emerald-600">{testOk}</span>}
            {testErr && <span className="min-w-0 flex-1 truncate text-sm text-rose-600">{testErr}</span>}
          </div>
        </section>

        <ErrorText text={error} />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnGhost}>
            取消
          </button>
          <button type="button" onClick={() => void submit()} className={btnPrimary}>
            保存
          </button>
        </div>
      </div>
    </Modal>
  )
}
