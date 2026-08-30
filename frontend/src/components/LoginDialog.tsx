import { useState } from 'react'
import { api, setAdminPassword } from '../api'
import { ErrorText, Modal, inputCls } from './ui'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function LoginDialog({ onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!password) {
      setError('请输入管理密码')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      setAdminPassword(password)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <Modal title="管理员登录" onClose={onClose} width="max-w-sm">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <p className="text-sm text-slate-500">输入管理密码后可添加和修改安排，游客仅有查看权限。</p>
        <input
          type="password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理密码"
          autoFocus
        />
        <ErrorText text={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100">
            取消
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            登录
          </button>
        </div>
      </form>
    </Modal>
  )
}
