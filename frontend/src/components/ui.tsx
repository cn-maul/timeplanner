import { useEffect, useRef, useState, type ReactNode } from 'react'

/** 共享按钮样式：主操作 / 幽灵 / 描边 / 危险幽灵 */
export const btnPrimary =
  'anim-press inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-white transition duration-200 ease-quart hover:brightness-[1.06] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'
export const btnGhost =
  'anim-press inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[14px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'
export const btnOutline =
  'anim-press inline-flex cursor-pointer items-center justify-center rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13.5px] font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition duration-200 ease-quart hover:bg-[#fbfbfd] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'
export const btnDangerGhost =
  'anim-press inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-[14px] font-medium text-[#c4342b] transition duration-200 ease-quart hover:bg-[#ff3b30]/[0.07] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'

/** 分段控件：灰槽 + 白色滑块。第二项为强调型时用 activeClass 覆盖 */
export const segTrack = 'items-center gap-0.5 rounded-full bg-black/[0.05] p-[3px]'
export const segTrackWide = `hidden sm:inline-flex ${segTrack}`
export const segTrackNarrow = `inline-flex sm:hidden ${segTrack}`
export const segBtn = 'anim-press cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition duration-200 ease-quart active:scale-[0.97]'
export const segOn = 'bg-white font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.12)]'

interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  width?: string
}

/** 统一的 Modal 外壳：scrim 淡出、面板材质化入场、中途可反向 */
export function Modal({ title, onClose, children, width = 'max-w-md' }: ModalProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 入场：先以初始态挂载，下一帧切到目标态（用 transition 而非 keyframes，可中断可反向）
    const raf = requestAnimationFrame(() => setOpen(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#1d1d1f]/30 p-4 transition-opacity duration-200 ease-quart ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`w-full ${width} flex max-h-[90vh] flex-col overflow-hidden rounded-panel bg-surface shadow-overlay transition duration-[400ms] ease-spring ${
          open ? 'scale-100 opacity-100 blur-0' : 'scale-[0.97] opacity-0 blur-[6px]'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-4">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="anim-press -mr-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/[0.05] text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.09] hover:text-ink active:scale-[0.94]"
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmProps {
  title: string
  message?: ReactNode
  confirmText?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** 统一确认弹窗：只用于不可逆操作 */
export function ConfirmDialog({ title, message, confirmText = '删除', onConfirm, onClose }: ConfirmProps) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1d1f]/30 p-4 transition-opacity duration-200 ease-quart ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        className={`w-full max-w-[340px] rounded-card bg-surface p-5 text-center shadow-overlay transition duration-[400ms] ease-spring ${
          open ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
        }`}
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#ff3b30]/[0.1] text-[#c4342b]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </span>
        <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {message && <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-2">{message}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={`${btnOutline} h-11 flex-1`}>
            取消
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="anim-press inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-[#ff3b30] text-[14px] font-semibold text-white transition duration-200 ease-quart hover:bg-[#e6342a] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? '处理中…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] leading-[1.6] text-ink-3">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-[10px] border border-black/[0.1] bg-white px-3 py-2 text-[14px] text-ink outline-none transition duration-200 ease-quart placeholder:text-ink-4 focus:border-accent focus:shadow-[0_0_0_4px_rgba(0,113,227,0.16)]'

export function ErrorText({ text }: { text: string }) {
  if (!text) return null
  return (
    <p className="rounded-[10px] border border-[#ff3b30]/[0.18] bg-[#ff3b30]/[0.06] px-3 py-2 text-[13px] leading-[1.6] text-[#c4342b]">
      {text}
    </p>
  )
}

/** 面板区块标题（表单分组用） */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-[13px] font-semibold tracking-[-0.005em] text-ink">{children}</h3>
}
