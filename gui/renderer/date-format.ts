const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export function formatBookmarkDate(value?: string | null): string {
  if (!value) return '?'

  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return value.trim()

  const date = new Date(ms)
  const weekday = WEEKDAYS[date.getUTCDay()]
  const month = MONTHS[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()

  return `${weekday} ${month} ${day}, ${year}`
}
