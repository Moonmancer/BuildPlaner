// Persistenz im localStorage. Bewusst defensiv: fehlerhafte/fehlende Daten
// dürfen die App nie zum Absturz bringen – im Zweifel starten wir leer.

import { DATA_VERSION, type AppData } from './types'

const STORAGE_KEY = 'buildplaner:data'

export function emptyData(): AppData {
  return { version: DATA_VERSION, builds: [] }
}

export function loadData(): AppData {
  if (typeof localStorage === 'undefined') return emptyData()
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (!parsed || !Array.isArray(parsed.builds)) return emptyData()
    // Künftige Migrationen anhand parsed.version hier einhängen.
    return { version: DATA_VERSION, builds: parsed.builds }
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
