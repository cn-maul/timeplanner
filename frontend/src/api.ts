import type { Block, RecurEvent, Settings, WeekData } from './types'

async function unwrap<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error || `请求失败 (HTTP ${res.status})`)
  }
  return body as T
}

const get = <T,>(url: string) => fetch(url).then((r) => unwrap<T>(r))

const send = <T,>(method: string, url: string, data?: unknown) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((r) => unwrap<T>(r))

export const api = {
  week: (date?: string) => get<WeekData>(`/api/week${date ? `?date=${date}` : ''}`),
  events: () => get<{ events: RecurEvent[] }>('/api/events'),
  createEvent: (e: Partial<RecurEvent>) => send<RecurEvent>('POST', '/api/events', e),
  updateEvent: (id: string, e: Partial<RecurEvent>) => send<RecurEvent>('PUT', `/api/events/${id}`, e),
  deleteEvent: (id: string) => send<{ ok: boolean }>('DELETE', `/api/events/${id}`),
  createBlock: (b: Partial<Block>) => send<Block>('POST', '/api/blocks', b),
  updateBlock: (id: string, b: Partial<Block>) => send<Block>('PUT', `/api/blocks/${id}`, b),
  deleteBlock: (id: string) => send<{ ok: boolean }>('DELETE', `/api/blocks/${id}`),
  updateSettings: (s: Settings) => send<Settings>('PUT', '/api/settings', s),
}
