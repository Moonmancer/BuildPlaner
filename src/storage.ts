// Persistenz im localStorage. Bewusst defensiv: fehlerhafte/fehlende Daten
// dürfen die App nie zum Absturz bringen – im Zweifel starten wir leer.

import { DATA_VERSION, type AppData, type Build } from './types'
import { CLASSES } from './ro/classes'

const STORAGE_KEY = 'buildplaner:data'

export function emptyData(): AppData {
  return { version: DATA_VERSION, builds: [] }
}

/** Normalisiert einen (evtl. älteren) Build. Migriert das frühere Freitext-Feld
 *  `jobClass` auf eine Klassen-ID, sofern der Text eindeutig einer Klasse entspricht. */
function migrateBuild(raw: unknown): Build {
  const b = (raw ?? {}) as Record<string, unknown>
  let classId = typeof b.classId === 'string' ? b.classId : null
  if (classId === null && typeof b.jobClass === 'string' && b.jobClass.trim()) {
    const q = b.jobClass.trim().toLowerCase()
    const match = CLASSES.find(
      (c) => c.id === q || c.name.toLowerCase() === q,
    )
    classId = match ? match.id : null
  }
  return {
    id: String(b.id ?? ''),
    name: typeof b.name === 'string' ? b.name : 'Build',
    classId,
    notes: typeof b.notes === 'string' ? b.notes : '',
    milestones: Array.isArray(b.milestones) ? (b.milestones as Build['milestones']) : [],
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : new Date().toISOString(),
  }
}

export function loadData(): AppData {
  if (typeof localStorage === 'undefined') return emptyData()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed || !Array.isArray(parsed.builds)) return emptyData()
    return { version: DATA_VERSION, builds: parsed.builds.map(migrateBuild) }
  } catch {
    console.warn('BuildPlaner: gespeicherte Daten unlesbar, starte leer.')
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('BuildPlaner: Speichern fehlgeschlagen.', err)
  }
}
