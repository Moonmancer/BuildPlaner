// Domänenmodell des BuildPlaners (Pre-Renewal).
// Phase 2: Struktur für Builds und Milestones. RO-Regeln/Validierung folgen in Phase 3.

export const STATS = ['STR', 'AGI', 'VIT', 'INT', 'DEX', 'LUK'] as const
export type StatKey = (typeof STATS)[number]
export type Stats = Record<StatKey, number>

/** Zugeordnete Skill-Level eines Milestones: Skill-ID (src/ro/skills.ts) -> Level. */
export type SkillLevels = Record<string, number>

/** Ein Fortschritts-Snapshot innerhalb eines Builds (z.B. "Lvl 10", "Endgame"). */
export interface Milestone {
  id: string
  label: string
  baseLevel: number
  jobLevel: number
  stats: Stats
  skills: SkillLevels
}

export interface Build {
  id: string
  name: string
  /** Klassen-ID aus der Registry (src/ro/classes.ts) oder null, wenn keine gewählt. */
  classId: string | null
  /** Optionaler Link zum Charakter (z.B. Calculator-URL). */
  charLink: string
  notes: string
  /** Zugehörige Gruppen (BuildGroup.id). Ein Build kann in mehreren Gruppen sein. */
  groupIds: string[]
  /** Job-Level, bei dem von First- zu Second-Class gewechselt wurde (40–50).
   *  Begrenzt die verfügbaren First-Class-Skillpunkte (relevant ab Phase 3c). */
  earlyJobChangeLevel: number
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

/** Benutzerdefinierte Gruppe/Ordner zum Organisieren der Builds.
 *  Gruppen können via parentId verschachtelt werden (Baum). */
export interface BuildGroup {
  id: string
  name: string
  parentId: string | null
  /** Ob die Gruppe in der Liste eingeklappt dargestellt wird. */
  collapsed?: boolean
}

/** Gesamter persistierter App-Zustand. `version` erlaubt spätere Migrationen. */
export interface AppData {
  version: number
  builds: Build[]
  groups: BuildGroup[]
}

export const DATA_VERSION = 1

export function emptyStats(): Stats {
  return { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 }
}
