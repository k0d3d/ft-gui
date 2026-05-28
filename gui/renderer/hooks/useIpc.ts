import { useEffect } from 'react'

declare global {
  interface Window {
    ftApi: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, fn: (...args: unknown[]) => void) => unknown
      off: (channel: string, handler: unknown) => void
    }
  }
}

export function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (!window.ftApi) {
    return Promise.reject(new Error('ftApi not available — preload may have failed to load'))
  }
  return window.ftApi.invoke(channel, ...args) as Promise<T>
}

export function useIpcEvent(
  channel: string,
  handler: (...args: unknown[]) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const h = window.ftApi.on(channel, handler)
    return () => window.ftApi.off(channel, h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
