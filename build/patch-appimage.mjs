#!/usr/bin/env node
/**
 * Strips X-AppImage-Version from the embedded .desktop file inside FT-GUI.AppImage.
 *
 * AppImageLauncher reads that field and appends "(version)" to the displayed app name.
 * Strategy:
 *   1. Find squashfs offset in the AppImage (search for 'hsqs' magic)
 *   2. Save the runtime prefix (bytes before squashfs)
 *   3. Write squashfs section to a temp file, extract with system unsquashfs
 *   4. Remove X-AppImage-Version from the .desktop file
 *   5. Repack with mksquashfs (from electron-builder cache)
 *   6. Concatenate original runtime prefix + new squashfs → write back in place
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appImagePath = path.resolve(__dirname, '../release/FT-GUI.AppImage')

const MKSQUASHFS = path.join(
  os.homedir(),
  '.cache/electron-builder/appimage/appimage-12.0.1/linux-x64/mksquashfs'
)

if (!fs.existsSync(appImagePath)) {
  console.error(`patch-appimage: not found → ${appImagePath}`)
  process.exit(1)
}
if (!fs.existsSync(MKSQUASHFS)) {
  console.warn('patch-appimage: mksquashfs not found in electron-builder cache, skipping')
  process.exit(0)
}

// 1. Find squashfs start offset — validate the superblock to skip false matches
//    in the ELF binary. A real squashfs superblock has:
//    - magic 'hsqs' (little-endian, offset 0)
//    - inode_count > 0 (offset 4, uint32)
//    - block_size that is a power-of-2 in [4096, 1048576] (offset 12, uint32)
const appImageBuf = fs.readFileSync(appImagePath)
const magic = Buffer.from('hsqs')
let squashfsOffset = -1

let searchFrom = 0
while (true) {
  const idx = appImageBuf.indexOf(magic, searchFrom)
  if (idx === -1) break
  if (idx + 16 <= appImageBuf.length) {
    const inodeCount = appImageBuf.readUInt32LE(idx + 4)
    const blockSize  = appImageBuf.readUInt32LE(idx + 12)
    const isPow2     = blockSize > 0 && (blockSize & (blockSize - 1)) === 0
    const inRange    = blockSize >= 4096 && blockSize <= 1048576
    if (inodeCount > 0 && isPow2 && inRange) {
      squashfsOffset = idx
      break
    }
  }
  searchFrom = idx + 1
}

if (squashfsOffset === -1) {
  console.log('patch-appimage: valid squashfs superblock not found, skipping')
  process.exit(0)
}
console.log(`patch-appimage: squashfs at offset ${squashfsOffset} (${hex(squashfsOffset)})`)

// 2. Save runtime prefix
const runtimeBuf = Buffer.from(appImageBuf.slice(0, squashfsOffset))

// 3. Write squashfs section to temp file and extract with system unsquashfs
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-appimage-'))
const squashfsTmp = path.join(tmpDir, 'fs.squashfs')
const squashfsRoot = path.join(tmpDir, 'squashfs-root')
const newSquashfs = path.join(tmpDir, 'new.squashfs')

try {
  fs.writeFileSync(squashfsTmp, appImageBuf.slice(squashfsOffset))

  console.log('patch-appimage: extracting squashfs…')
  execFileSync('unsquashfs', ['-d', squashfsRoot, squashfsTmp], { stdio: 'pipe' })

  // 4. Patch desktop file
  const desktopFile = fs.readdirSync(squashfsRoot).find((f) => f.endsWith('.desktop'))
  if (!desktopFile) throw new Error('No .desktop file found in squashfs-root')

  const desktopPath = path.join(squashfsRoot, desktopFile)
  const original = fs.readFileSync(desktopPath, 'utf8')
  const removed = (original.match(/^X-AppImage-Version=.*/m) ?? ['(none)'])[0]
  const patched = original.replace(/^X-AppImage-Version=.*\r?\n?/m, '')

  if (original === patched) {
    console.log('patch-appimage: X-AppImage-Version not present, nothing to do')
    process.exit(0)
  }

  fs.writeFileSync(desktopPath, patched, 'utf8')
  console.log(`patch-appimage: removed "${removed}"`)

  // 5. Repack squashfs
  console.log('patch-appimage: repacking squashfs…')
  execFileSync(MKSQUASHFS, [
    squashfsRoot,
    newSquashfs,
    '-root-owned',
    '-noappend',
    '-comp', 'xz',
    '-b', '1M',
    '-no-progress',
  ], { stdio: 'pipe' })

  // 6. Reassemble: original runtime prefix + new squashfs
  console.log('patch-appimage: assembling…')
  const newSquashfsBuf = fs.readFileSync(newSquashfs)
  const out = Buffer.concat([runtimeBuf, newSquashfsBuf])
  fs.writeFileSync(appImagePath, out)
  fs.chmodSync(appImagePath, 0o755)
  console.log(`patch-appimage: done — ${(out.length / 1024 / 1024).toFixed(1)} MB`)

} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

function hex(n) { return `0x${n.toString(16)}` }
