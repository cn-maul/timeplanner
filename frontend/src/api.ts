import type { Block, IntegrationUpdate, PendingTicket, RecurEvent, Settings, WeekData } from './types'

export interface SettingsInfo extends Settings {
  passwordSet: boolean
  ticketUrl: string
  ticketKeySet: boolean
}

// ---------- 管理密码的本地保存 ----------

const STORAGE_KEY = 'timeplanner.adminPassword'

function loadStoredPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

let adminPassword = loadStoredPassword()

/** 当前保存的管理密码（空字符串表示游客） */
export function getAdminPassword(): string {
  return adminPassword
}

export function setAdminPassword(pw: string): void {
  adminPassword = pw
  try {
    if (pw) localStorage.setItem(STORAGE_KEY, pw)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* localStorage 不可用时仅保留内存态 */
  }
}

// ---------- 请求封装 ----------

async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error || `请求失败 (HTTP ${res.status})`)
  }
  return body as T
}

function adminHeader(): Record<string, string> {
  return adminPassword ? { 'X-Admin-Password': adminPassword } : {}
}

const get = <T,>(url: string) => fetch(url, { headers: adminHeader() }).then((r) => unwrap<T>(r))

function sendHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...adminHeader() }
}

const send = <T,>(method: string, url: string, data?: unknown) =>
  fetch(url, {
    method,
    headers: sendHeaders(),
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((r) => unwrap<T>(r))

export const api = {
  week: (date?: string) => get<WeekData>(`/api/week${date ? `?date=${date}` : ''}`),
  settings: () => get<SettingsInfo>('/api/settings'),
  login: (password: string) => send<{ ok: boolean }>('POST', '/api/login', { password }),
  changePassword: (next: string) => send<{ ok: boolean }>('POST', '/api/password', { next }),
  events: () => get<{ events: RecurEvent[] }>('/api/events'),
  createEvent: (e: Partial<RecurEvent>) => send<RecurEvent>('POST', '/api/events', e),
  updateEvent: (id: string, e: Partial<RecurEvent>) => send<RecurEvent>('PUT', `/api/events/${id}`, e),
  deleteEvent: (id: string) => send<{ ok: boolean }>('DELETE', `/api/events/${id}`),
  createBlock: (b: Partial<Block>) => send<Block>('POST', '/api/blocks', b),
  updateBlock: (id: string, b: Partial<Block>) => send<Block>('PUT', `/api/blocks/${id}`, b),
  deleteBlock: (id: string) => send<{ ok: boolean }>('DELETE', `/api/blocks/${id}`),
  updateSettings: (s: Settings & { integration?: IntegrationUpdate }) => send<Settings>('PUT', '/api/settings', s),
  ticketsPending: () => get<{ items: PendingTicket[]; total: number }>('/api/integration/tickets'),
  ticketsTest: (form?: IntegrationUpdate) => send<{ ok: boolean; pending: number }>('POST', '/api/integration/tickets/test', form ?? {}),
}
