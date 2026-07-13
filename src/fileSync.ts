// Stilles Datei-Backup über die File System Access API (Chrome/Edge).
// Der Nutzer wählt EINMAL eine Datei auf der Platte; wir merken uns den Handle in
// IndexedDB und schreiben danach still bei jeder Datenänderung dorthin. So gehen
// Builds nicht verloren, wenn localStorage/Temp-Daten aufgeräumt werden.

import { DATA_VERSION, type Build, type BuildGroup } from './types'
import { migrateBuild, migrateGroups } from './storage'

type PermState = 'granted' | 'denied' | 'prompt'

/** File-Handle inkl. der (noch nicht überall typisierten) Permission-Methoden. */
interface PermFileHandle extends FileSystemFileHandle {
  queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermState>
  requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermState>
}

interface FsPickerWindow {
  showSaveFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandle>
  showOpenFilePicker?: (opts?: unknown) => Promise<FileSystemFileHandle[]>
}

const win = () => window as unknown as FsPickerWindow

export const fsSupported =
  typeof window !== 'undefined' && 'showSaveFilePicker' in window

const PICKER_TYPES = [
  {
    description: 'BuildPlaner-Daten',
    accept: { 'application/json': ['.json'] },
  },
]

// ---------- Serialisierung (volle Sammlung als JSON) ----------

export function serialize(builds: Build[], groups: BuildGroup[]): string {
  return JSON.stringify({ version: DATA_VERSION, builds, groups }, null, 2)
}

export function parse(
  text: string,
): { builds: Build[]; groups: BuildGroup[] } | null {
  try {
    const o = JSON.parse(text) as Record<string, unknown>
    if (!o || !Array.isArray(o.builds)) return null
    return {
      builds: o.builds.map(migrateBuild),
      groups: migrateGroups(o.groups),
    }
  } catch {
    return null
  }
}

// ---------- Handle-Persistenz in IndexedDB ----------

const DB_NAME = 'buildplaner-fs'
const STORE = 'handles'
const KEY = 'backup'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(handle, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb()
  const result = await new Promise<FileSystemFileHandle | null>(
    (resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null)
      req.onerror = () => reject(req.error)
    },
  )
  db.close()
  return result
}

export async function clearHandle(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

// ---------- File System Access ----------

export async function pickSaveFile(): Promise<FileSystemFileHandle | null> {
  const fn = win().showSaveFilePicker
  if (!fn) return null
  return await fn({ suggestedName: 'buildplaner-data.json', types: PICKER_TYPES })
}

export async function pickOpenFile(): Promise<FileSystemFileHandle | null> {
  const fn = win().showOpenFilePicker
  if (!fn) return null
  const handles = await fn({ multiple: false, types: PICKER_TYPES })
  return handles[0] ?? null
}

export async function queryPermissionState(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<PermState> {
  const h = handle as PermFileHandle
  if (!h.queryPermission) return 'granted'
  return await h.queryPermission({ mode })
}

/** Sichert Schreibrechte; fragt bei Bedarf nach (nur innerhalb einer Nutzeraktion möglich). */
export async function ensurePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const h = handle as PermFileHandle
  if (!h.queryPermission || !h.requestPermission) return true
  if ((await h.queryPermission({ mode })) === 'granted') return true
  return (await h.requestPermission({ mode })) === 'granted'
}

export async function writeText(
  handle: FileSystemFileHandle,
  text: string,
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

export async function readText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return await file.text()
}
