export const pad2 = (n: number) => String(n).padStart(2, '0')

/** "09:30" → 570；"24:00" → 1440 */
export function mm(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** 分钟数 → "HH:MM"（1440 → "24:00"） */
export function hhmm(mins: number): string {
  const v = Math.max(0, Math.min(1440, Math.round(mins)))
  return `${pad2(Math.floor(v / 60))}:${pad2(v % 60)}`
}

/** 分钟数 → "1小时30分" / "45分钟" */
export function fmtDur(mins: number): string {
  if (mins <= 0) return '0分钟'
  if (mins < 60) return `${mins}分钟`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}小时${m}分` : `${h}小时`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function todayStr(): string {
  return fmtDate(new Date())
}

export function isoWeekday(d: Date): number {
  const w = d.getDay()
  return w === 0 ? 7 : w
}

/** "2026-08-29" → "8/29" */
export function shortDate(s: string): string {
  const d = parseDate(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 周起止 → "2026年8月24日 – 8月30日" */
export function weekRangeLabel(ws: string, we: string): string {
  const a = parseDate(ws)
  const b = parseDate(we)
  const sameMonth = a.getMonth() === b.getMonth()
  return `${a.getFullYear()}年${a.getMonth() + 1}月${a.getDate()}日 – ${sameMonth ? '' : `${b.getMonth() + 1}月`}${b.getDate()}日`
}

/** "2026-08-29" → "8月29日 周六" */
export function dateLabel(s: string): string {
  const d = parseDate(s)
  const wd = '一二三四五六日'[isoWeekday(d) - 1]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${wd}`
}
