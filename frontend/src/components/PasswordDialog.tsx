import { useState } from 'react'
import { api, setAdminPassword } from '../api'
import { ErrorText, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui'

interface Props {
  /** set=尚未设置密码；change=修改已有密码（当前密码由请求头自动携带） */
  mode: 'set' | 'change'
  onClose: () => void
  onSaved: () => void
}

export default function PasswordDialog({ mode, onClose, onSaved }: Props) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!next) {
      setError('请输入新密码')
      return
    }
    if (next.length > 128) {
      setError('密码不能超过 128 字符')
      return
    }
    if (next !== confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.changePassword(next)
      setAdminPassword(next)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'set' ? '设置管理密码' : '修改管理密码'} onClose={onClose} width="max-w-sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className="text-sm text-slate-500">
          {mode === 'set'
            ? '设置后，访问者只能查看时间表，添加和修改需要输入密码。'
            : '保存后其他已登录的设备需要用新密码重新登录。'}
        </p>
        <Field label="新密码">
          <input type="password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} autoFocus />
        </Field>
        <Field label="确认新密码">
          <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <ErrorText text={error} />
        <div className="flex justify-end gap-2 pt-1">
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
