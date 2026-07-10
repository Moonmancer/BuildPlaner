// Domänenmodell des BuildPlaners (Pre-Renewal).
// Phase 2: Struktur für Builds und Milestones. RO-Regeln/Validierung folgen in Phase 3.

export const STATS = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'] as const
export type StatKey = (typeof STATS)[number]
export type Stats = Record<StatKey, number>

/** Ein Skill-Eintrag innerhalb eines Milestones.
 *  Phase 2 nutzt einen freien Namen; Phase 3 ersetzt das durch eine Auswahl
 *  aus den Skill-Bäumen (dann mit skillId statt Freitext). */
export interface SkillEntry {
  id: string
  name: string
  level: number
}

/** Ein Fortschritts-Snapshot innerhalb eines Builds (z.B. "Lvl 10", "Endgame"). */
export interface Milestone {
  id: string
  label: string
  baseLevel: number
  jobLevel: number
  stats: Stats
  skills: SkillEntry[]
}

export interface Build {
  id: string
  name: string
  /** Klassen-ID aus der Registry (src/ro/classes.ts) oder null, wenn keine gewählt. */
  classId: string | null
  notes: string
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

/** Gesamter persistierter App-Zustand. `version` erlaubt spätere Migrationen. */
export interface AppData {
  version: number
  builds: Build[]
}

export const DATA_VERSION = 1

export function emptyStats(): Stats {
  return { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 }
}
