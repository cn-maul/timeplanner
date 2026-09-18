import { useCallback, useEffect, useRef, useState } from 'react'
import type { Block, Occurrence, RecurEvent, WeekData } from './types'
import { api, getAdminPassword, setAdminPassword, type SettingsInfo } from './api'
import { addDays, dateLabel, fmtDate, fmtDur, hhmm, mm, parseDate, todayStr, weekRangeLabel } from './util'
import { BLOCK_CATEGORY_KEYS, BLOCK_CATEGORIES } from './constants'
import WeekGrid from './components/WeekGrid'
import DayView from './components/DayView'
import EventsView from './components/EventsView'
import EventDialog from './components/EventDialog'
import BlockDialog from './components/BlockDialog'
import SettingsDialog, { type SettingsPayload } from './components/SettingsDialog'
import LoginDialog from './components/LoginDialog'
import PasswordDialog from './components/PasswordDialog'
import { ConfirmDialog, btnPrimary, segBtn, segOn, segTrackNarrow, segTrackWide } from './components/ui'

type View = 'week' | 'day' | 'events'
type Toast = { id: number; type: 'ok' | 'err'; text: string }
type ConfirmState = { title: string; message: string; onConfirm: () => Promise<void> }

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(todayStr())
  const [week, setWeek] = useState<WeekData | null>(null)
  const [events, setEvents] = useState<RecurEvent[] | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [blockModal, setBlockModal] = useState<{ block?: Block; date?: string; start?: string; end?: string } | null>(null)
  const [eventModal, setEventModal] = useState<{ event?: RecurEvent } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null)
  const [settingsInfo, setSettingsInfo] = useState<SettingsInfo | null>(null)
  const [admin, setAdmin] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const toast = useCallback((text: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts, { id, type, text }])
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3500)
  }, [])

  const refreshWeek = useCallback(async () => {
    try {
      setWeek(await api.week(anchor))
    } catch (e) {
      toast(errText(e), 'err')
    }
  }, [anchor, toast])

  const refreshEvents = useCallback(async () => {
    try {
      setEvents((await api.events()).events)
    } catch (e) {
      toast(errText(e), 'err')
    }
  }, [toast])

  useEffect(() => {
    void refreshWeek()
  }, [refreshWeek])
  useEffect(() => {
    void refreshEvents()
  }, [refreshEvents])

  // 启动时获取密码状态，并校验本地保存的管理密码是否仍有效
  useEffect(() => {
    void (async () => {
      try {
        const info = await api.settings()
        setSettingsInfo(info)
        setPasswordSet(info.passwordSet)
        const stored = getAdminPassword()
        if (info.passwordSet && stored) {
          try {
            await api.login(stored)
            setAdmin(true)
          } catch {
            setAdminPassword('')
            toast('本地保存的管理密码已失效，请重新登录', 'err')
          }
        }
      } catch (e) {
        setPasswordSet(false)
        toast(errText(e), 'err')
      }
    })()
  }, [toast])

  /** 未设置密码时人人可编辑；设置后需要登录 */
  const isAdmin = admin || passwordSet === false

  const logout = () => {
    setAdminPassword('')
    setAdmin(false)
    toast('已退出管理员模式')
  }

  const onPasswordSaved = () => {
    setPasswordSet(true)
    setAdmin(true)
    setPasswordDialogOpen(false)
    toast('管理密码已保存，修改操作需要密码')
  }

  // 页面加载/切换视图后自动滚动到当前时间附近
  useEffect(() => {
    if (!week || view === 'events') return
    const visible = view === 'week' ? week.days.find((d) => d.isToday) : week.days.find((d) => d.date === anchor)
    if (!visible) return
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const s = mm(week.settings.dayStart)
    if (mins < s) return
    const rowH = view === 'day' ? 64 : 52
    mainRef.current?.scrollTo({ top: Math.max(0, ((mins - s) / 60) * rowH - 140), behavior: 'smooth' })
  }, [week, view, anchor])

  const shift = (dir: number) => {
    const d = parseDate(anchor)
    setAnchor(fmtDate(addDays(d, view === 'day' ? dir : dir * 7)))
  }

  const openCreate = useCallback((date: string, start: number, end: number) => {
    setBlockModal({ date, start: hhmm(start), end: hhmm(end) })
  }, [])

  const editBlock = useCallback((b: Block) => setBlockModal({ block: b }), [])

  const editEvent = useCallback(
    (occ: Occurrence) => {
      const ev = events?.find((e) => e.id === occ.eventId)
      if (ev) setEventModal({ event: ev })
    },
    [events],
  )

  const saveBlock = async (values: Omit<Block, 'id'>) => {
    if (blockModal?.block) {
      await api.updateBlock(blockModal.block.id, values)
    } else {
      await api.createBlock(values)
    }
    setBlockModal(null)
    toast('已保存安排')
    await refreshWeek()
  }

  /** 弹出统一确认框，替代 window.confirm */
  const deleteBlock = () => {
    const b = blockModal?.block
    if (!b) return
    setConfirm({
      title: '删除这个安排？',
      message: `「${b.title || BLOCK_CATEGORIES[b.category].label}」${b.date} ${b.start}–${b.end}，删除后无法恢复。`,
      onConfirm: async () => {
        await api.deleteBlock(b.id)
        setBlockModal(null)
        setConfirm(null)
        toast('已删除安排')
        await refreshWeek()
      },
    })
  }

  const saveEvent = async (values: Omit<RecurEvent, 'id'>) => {
    if (eventModal?.event) {
      await api.updateEvent(eventModal.event.id, values)
    } else {
      await api.createEvent(values)
    }
    setEventModal(null)
    toast('已保存周期事件')
    await Promise.all([refreshEvents(), refreshWeek()])
  }

  const deleteEvent = () => {
    const ev = eventModal?.event
    if (!ev) return
    setConfirm({
      title: `删除周期事件「${ev.title}」？`,
      message: '它将从每周时间表中移除，占用的时段会重新变为空闲。',
      onConfirm: async () => {
        await api.deleteEvent(ev.id)
        setEventModal(null)
        setConfirm(null)
        toast('已删除周期事件')
        await Promise.all([refreshEvents(), refreshWeek()])
      },
    })
  }

  const toggleEvent = async (ev: RecurEvent) => {
    try {
      await api.updateEvent(ev.id, { ...ev, enabled: !ev.enabled })
      await Promise.all([refreshEvents(), refreshWeek()])
    } catch (e) {
      toast(errText(e), 'err')
    }
  }

  const removeEventFromList = (ev: RecurEvent) => {
    setConfirm({
      title: `删除周期事件「${ev.title}」？`,
      message: '它将从每周时间表中移除，占用的时段会重新变为空闲。',
      onConfirm: async () => {
        try {
          await api.deleteEvent(ev.id)
          await Promise.all([refreshEvents(), refreshWeek()])
          setConfirm(null)
          toast('已删除周期事件')
        } catch (e) {
          setConfirm(null)
          toast(errText(e), 'err')
        }
      },
    })
  }

  const saveSettings = async (payload: SettingsPayload) => {
    await api.updateSettings(payload)
    const info = await api.settings()
    setSettingsInfo(info)
    setSettingsOpen(false)
    toast(info.ticketUrl ? '设置已保存（工单集成已启用）' : '设置已保存')
    await refreshWeek()
  }

  const day = week?.days.find((d) => d.date === anchor)

  return (
    <div className="min-h-full">
      {/* 吸顶玻璃导航：只在内容确实滚到下面时才出现分隔线 */}
      <header className={`glass-nav sticky top-0 z-40 ${scrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto flex h-[54px] max-w-[1080px] items-center gap-2 px-4 sm:gap-3 sm:px-5">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <span className="hidden text-[15px] font-semibold tracking-[-0.01em] text-ink sm:inline">时间规划助手</span>
          </div>

          <nav className={`${segTrackWide} ml-1 shrink-0`}>
            {(
              [
                ['week', '周计划'],
                ['day', '日计划'],
                ['events', '周期事件'],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setView(key)} className={`${segBtn} ${view === key ? segOn : ''}`}>
                {label}
              </button>
            ))}
          </nav>

          {/* 窄屏用更紧凑的分段控件 */}
          <nav className={`${segTrackNarrow} ml-1 shrink-0`}>
            {(
              [
                ['week', '周'],
                ['day', '日'],
                ['events', '事件'],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setView(key)} className={`${segBtn} px-3 ${view === key ? segOn : ''}`}>
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {view !== 'events' && (
              <>
                <button
                  type="button"
                  onClick={() => shift(-1)}
                  className="anim-press flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.94]"
                  title={view === 'day' ? '前一天' : '上一周'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setAnchor(todayStr())}
                  className="anim-press shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97]"
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  className="anim-press flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.94]"
                  title={view === 'day' ? '后一天' : '下一周'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                <span className="tnum ml-1 hidden text-[13.5px] font-medium text-ink md:inline">
                  {view === 'week' && week ? weekRangeLabel(week.weekStart, week.weekEnd) : dateLabel(anchor)}
                </span>
              </>
            )}
            {passwordSet === true && !admin && (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="anim-press cursor-pointer rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97]"
              >
                管理员登录
              </button>
            )}
            {passwordSet === true && admin && (
              <>
                <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] font-medium text-ink-2 sm:flex">
                  <span className="h-[7px] w-[7px] rounded-full bg-live" style={{ animation: 'pulse-dot 2.2s infinite' }} />
                  管理员
                </span>
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(true)}
                  className="anim-press hidden cursor-pointer rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97] sm:block"
                >
                  修改密码
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="anim-press cursor-pointer rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97]"
                >
                  退出
                </button>
              </>
            )}
            {passwordSet === false && (
              <button
                type="button"
                onClick={() => setPasswordDialogOpen(true)}
                title="设置管理密码后，其他访问者将只能查看"
                className="anim-press hidden cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.97] sm:block"
              >
                设置密码
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="设置"
                className="anim-press ml-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-2 transition duration-200 ease-quart hover:bg-black/[0.05] hover:text-ink active:scale-[0.94]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}
        className="mx-auto h-[calc(100vh-54px)] max-w-[1080px] overflow-y-auto px-5 pb-12 pt-5"
      >
        <div key={view}>
          {view === 'week' && week && (
            <WeekSection
              week={week}
              editable={isAdmin}
              onCreateIn={openCreate}
              onEditBlock={editBlock}
              onEditEvent={editEvent}
              onOpenDay={(date) => {
                setAnchor(date)
                setView('day')
              }}
              onGoEvents={() => setView('events')}
            />
          )}
          {view === 'day' && week && day && (
            <DayView day={day} settings={week.settings} editable={isAdmin} onCreateIn={openCreate} onEditBlock={editBlock} onEditEvent={editEvent} />
          )}
          {view === 'events' && (
            <EventsView
              events={events}
              editable={isAdmin}
              onAdd={() => setEventModal({})}
              onEdit={(ev) => setEventModal({ event: ev })}
              onToggle={(ev) => void toggleEvent(ev)}
              onDelete={removeEventFromList}
            />
          )}
          {view !== 'events' && !week && <p className="p-12 text-center text-[13px] text-ink-4">加载中…</p>}
        </div>
      </main>

      {blockModal && (
        <BlockDialog
          initial={blockModal}
          ticketsEnabled={!!settingsInfo?.ticketUrl}
          onClose={() => setBlockModal(null)}
          onSave={saveBlock}
          onDelete={blockModal.block ? deleteBlock : undefined}
        />
      )}
      {eventModal && (
        <EventDialog
          initial={eventModal.event ?? null}
          onClose={() => setEventModal(null)}
          onSave={saveEvent}
          onDelete={eventModal.event ? deleteEvent : undefined}
        />
      )}
      {settingsOpen && week && (
        <SettingsDialog
          initial={
            settingsInfo ?? {
              dayStart: week.settings.dayStart,
              dayEnd: week.settings.dayEnd,
              passwordSet: false,
              ticketUrl: '',
              ticketKeySet: false,
            }
          }
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
      {loginOpen && (
        <LoginDialog
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            setLoginOpen(false)
            setAdmin(true)
            toast('已进入管理员模式')
          }}
        />
      )}
      {passwordDialogOpen && (
        <PasswordDialog mode={passwordSet ? 'change' : 'set'} onClose={() => setPasswordDialogOpen(false)} onSaved={onPasswordSaved} />
      )}
      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message} onClose={() => setConfirm(null)} onConfirm={confirm.onConfirm} />
      )}

      {/* 轻提示：底部居中，深色胶囊 */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-full bg-[#1d1d1f]/92 px-4 py-2.5 text-[13.5px] font-medium text-white shadow-overlay backdrop-blur-xl"
            style={{ animation: 'toast-in 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: t.type === 'ok' ? '#30d158' : '#ff453a' }} />
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

interface WeekSectionProps {
  week: WeekData
  /** false=游客只读：空闲格不可点击、隐藏引导按钮 */
  editable: boolean
  onCreateIn: (date: string, start: number, end: number) => void
  onEditBlock: (b: Block) => void
  onEditEvent: (occ: Occurrence) => void
  onOpenDay: (date: string) => void
  onGoEvents: () => void
}

function WeekSection({ week, editable, onCreateIn, onEditBlock, onEditEvent, onOpenDay, onGoEvents }: WeekSectionProps) {
  const s = week.stats
  const totalMin = Math.max(1, s.freeMin + s.fixedMin + s.plannedMin)
  const pct = (n: number) => `${(n / totalMin) * 100}%`

  const legend = [
    { label: '固定安排', value: s.fixedMin, color: '#aeaeb2' },
    { label: '已计划', value: s.plannedMin, color: '#0071e3' },
    { label: '空闲', value: s.freeMin, color: '#30d158' },
    ...BLOCK_CATEGORY_KEYS.filter((k) => (s.byCategory[k] ?? 0) > 0).map((k) => ({
      label: BLOCK_CATEGORIES[k].label,
      value: s.byCategory[k] ?? 0,
      color: BLOCK_CATEGORIES[k].dot,
    })),
  ]

  return (
    <div className="flex flex-col gap-4">
      {week.eventCount === 0 && editable && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-card bg-surface px-4 py-3.5 shadow-card sm:flex-row sm:items-center">
          <span className="text-[13.5px] leading-[1.65] text-ink">
            你还没有录入周期事件，整周时间都会被视为空闲。先添加课程、例会等固定安排吧。
          </span>
          <button type="button" onClick={onGoEvents} className={`${btnPrimary} h-9 shrink-0 px-4 text-[13.5px]`}>
            去添加
          </button>
        </div>
      )}

      {/* 本周时间预算：一段连续面板，配比条 + 图例，不用碎卡片堆 */}
      <div className="rounded-panel bg-surface px-4 py-3.5 shadow-card">
        <div className="flex items-center gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 text-[13px] text-ink-2">本周可用时间</span>
            <span className="flex h-2 min-w-0 flex-1 gap-1 overflow-hidden rounded-full bg-track">
              {s.fixedMin > 0 && <span className="bg-[#aeaeb2]" style={{ width: pct(s.fixedMin) }} />}
              {s.plannedMin > 0 && <span className="bg-accent" style={{ width: pct(s.plannedMin) }} />}
              {s.freeMin > 0 && <span className="min-w-1 flex-1 bg-[#30d158]" />}
            </span>
          </div>
          <span className="shrink-0 text-[12.5px] text-ink-3">
            空闲 <span className="tnum text-[15px] font-semibold tracking-[-0.01em] text-ink">{fmtDur(s.freeMin)}</span>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: l.color }} />
              {l.label}
              <span className="tnum font-semibold text-ink">{fmtDur(l.value)}</span>
            </span>
          ))}
        </div>
      </div>

      <WeekGrid
        days={week.days}
        settings={week.settings}
        onCreateIn={editable ? onCreateIn : undefined}
        onEditBlock={editable ? onEditBlock : undefined}
        onEditEvent={editable ? onEditEvent : undefined}
        onOpenDay={onOpenDay}
      />
    </div>
  )
}
