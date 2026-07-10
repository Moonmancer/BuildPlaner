// Persistenz im localStorage. Bewusst defensiv: fehlerhafte/fehlende Daten
// dürfen die App nie zum Absturz bringen – im Zweifel starten wir leer.

import {
  DATA_VERSION,
  type AppData,
  type Build,
  type BuildGroup,
} from './types'
import { CLASSES } from './ro/classes'

const STORAGE_KEY = 'buildplaner:data'

export function emptyData(): AppData {
  return { version: DATA_VERSION, builds: [], groups: [] }
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
  // groupId (alt, einzeln) -> groupIds (neu, mehrere)
  let groupIds: string[] = []
  if (Array.isArray(b.groupIds)) {
    groupIds = b.groupIds.filter((g): g is string => typeof g === 'string')
  } else if (typeof b.groupId === 'string') {
    groupIds = [b.groupId]
  }
  return {
    id: String(b.id ?? ''),
    name: typeof b.name === 'string' ? b.name : 'Build',
    classId,
    charLink: typeof b.charLink === 'string' ? b.charLink : '',
    notes: typeof b.notes === 'string' ? b.notes : '',
    groupIds,
    milestones: Array.isArray(b.milestones) ? (b.milestones as Build['milestones']) : [],
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
    updatedAt: typeof b.updatedAt === 'string' ? b.updatedAt : new Date().toISOString(),
  }
}

function migrateGroups(raw: unknown): BuildGroup[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((g) => (g ?? {}) as Record<string, unknown>)
    .filter((g) => typeof g.id === 'string' && typeof g.name === 'string')
    .map((g) => ({
      id: String(g.id),
      name: String(g.name),
      parentId: typeof g.parentId === 'string' ? g.parentId : null,
      collapsed: g.collapsed === true,
    }))
}

export function loadData(): AppData {
  if (typeof localStorage === 'undefined') return emptyData()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed || !Array.isArray(parsed.builds)) return emptyData()
    return {
      version: DATA_VERSION,
      builds: parsed.builds.map(migrateBuild),
      groups: migrateGroups(parsed.groups),
    }
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
