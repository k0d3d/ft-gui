import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('./package.json') as { version: string }

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@src': resolve('src'),
      },
    },
    build: {
      outDir: 'dist-gui/main',
      lib: {
        entry: resolve('gui/main/main.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-gui/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
      lib: {
        entry: resolve('gui/main/preload.ts'),
      },
    },
  },
  renderer: {
    root: resolve('gui/renderer'),
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    build: {
      outDir: resolve('dist-gui/renderer'),
      rollupOptions: {
        input: resolve('gui/renderer/index.html'),
      },
    },
  },
})
