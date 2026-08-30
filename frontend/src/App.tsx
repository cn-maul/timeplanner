import { useCallback, useEffect, useRef, useState } from 'react'
import type { Block, Occurrence, RecurEvent, Settings, WeekData } from './types'
import { api, getAdminPassword, setAdminPassword } from './api'
import { addDays, dateLabel, fmtDate, fmtDur, hhmm, mm, parseDate, todayStr, weekRangeLabel } from './util'
import { BLOCK_CATEGORY_KEYS, BLOCK_CATEGORIES } from './constants'
import WeekGrid from './components/WeekGrid'
import DayView from './components/DayView'
import EventsView from './components/EventsView'
import EventDialog from './components/EventDialog'
import BlockDialog from './components/BlockDialog'
import SettingsDialog from './components/SettingsDialog'
import LoginDialog from './components/LoginDialog'
import PasswordDialog from './components/PasswordDialog'

type View = 'week' | 'day' | 'events'
type Toast = { id: number; type: 'ok' | 'err'; text: string }

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
  const [admin, setAdmin] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
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

  const deleteBlock = async () => {
    if (!blockModal?.block) return
    if (!window.confirm('确定删除这个安排吗？')) return
    await api.deleteBlock(blockModal.block.id)
    setBlockModal(null)
    toast('已删除安排')
    await refreshWeek()
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

  const deleteEvent = async () => {
    if (!eventModal?.event) return
    if (!window.confirm(`确定删除周期事件「${eventModal.event.title}」吗？`)) return
    await api.deleteEvent(eventModal.event.id)
    setEventModal(null)
    toast('已删除周期事件')
    await Promise.all([refreshEvents(), refreshWeek()])
  }

  const toggleEvent = async (ev: RecurEvent) => {
    try {
      await api.updateEvent(ev.id, { ...ev, enabled: !ev.enabled })
      await Promise.all([refreshEvents(), refreshWeek()])
    } catch (e) {
      toast(errText(e), 'err')
    }
  }

  const removeEventFromList = async (ev: RecurEvent) => {
    if (!window.confirm(`确定删除周期事件「${ev.title}」吗？`)) return
    try {
      await api.deleteEvent(ev.id)
      await Promise.all([refreshEvents(), refreshWeek()])
      toast('已删除周期事件')
    } catch (e) {
      toast(errText(e), 'err')
    }
  }

  const saveSettings = async (s: Settings) => {
    await api.updateSettings(s)
    setSettingsOpen(false)
    toast('设置已保存')
    await refreshWeek()
  }

  const day = week?.days.find((d) => d.date === anchor)

  return (
    <div className="min-h-full bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <span className="text-lg">🗓️</span>
            <span className="hidden sm:inline">时间规划助手</span>
          </div>

          <nav className="ml-1 flex items-center gap-1 rounded-full bg-slate-100 p-1">
            {(
              [
                ['week', '周计划'],
                ['day', '日计划'],
                ['events', '周期事件'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  view === key ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
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
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  title={view === 'day' ? '前一天' : '上一周'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" onClick={() => setAnchor(todayStr())} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100">
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  title={view === 'day' ? '后一天' : '下一周'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                <span className="ml-1 hidden text-sm font-medium text-slate-700 md:inline">
                  {view === 'week' && week ? weekRangeLabel(week.weekStart, week.weekEnd) : dateLabel(anchor)}
                </span>
              </>
            )}
            {passwordSet === true && !admin && (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                管理员登录
              </button>
            )}
            {passwordSet === true && admin && (
              <>
                <span className="mr-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">管理员</span>
                <button
                  type="button"
                  onClick={() => setPasswordDialogOpen(true)}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  修改密码
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
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
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100"
              >
                设置密码
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="设置"
                className="ml-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={mainRef} className="mx-auto h-[calc(100vh-3.5rem)] max-w-[1440px] overflow-y-auto p-4 pb-10">
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
            onDelete={(ev) => void removeEventFromList(ev)}
          />
        )}
        {view !== 'events' && !week && <p className="p-10 text-center text-sm text-slate-400">加载中…</p>}
      </main>

      {blockModal && (
        <BlockDialog
          initial={blockModal}
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
      {settingsOpen && week && <SettingsDialog initial={week.settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
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

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${t.type === 'ok' ? 'bg-slate-900' : 'bg-rose-600'}`}>
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
  return (
    <div>
      {week.eventCount === 0 && editable && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>你还没有录入周期事件，整周时间都会被视为空闲。先添加课程、例会等固定安排吧。</span>
          <button type="button" onClick={onGoEvents} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-500">
            去添加
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
          空闲 <b className="font-semibold text-slate-900">{fmtDur(s.freeMin)}</b>
        </span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
          固定安排 <b className="font-semibold text-slate-900">{fmtDur(s.fixedMin)}</b>
        </span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
          已计划 <b className="font-semibold text-slate-900">{fmtDur(s.plannedMin)}</b>
        </span>
        {BLOCK_CATEGORY_KEYS.filter((k) => (s.byCategory[k] ?? 0) > 0).map((k) => (
          <span key={k} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            <span className={`h-2 w-2 rounded-full ${BLOCK_CATEGORIES[k].dot}`} />
            {BLOCK_CATEGORIES[k].label} {fmtDur(s.byCategory[k] ?? 0)}
          </span>
        ))}
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
