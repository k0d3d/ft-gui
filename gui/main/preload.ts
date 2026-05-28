import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('ftApi', {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),

  on: (channel: string, fn: (...args: unknown[]) => void) => {
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => fn(...args)
    ipcRenderer.on(channel, handler)
    return handler
  },

  off: (channel: string, handler: unknown) =>
    ipcRenderer.removeListener(channel, handler as (...args: unknown[]) => void),
})
