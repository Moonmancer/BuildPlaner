// Parser für die Arcadia Control Panel "Viewing Character"-Seite (eingefügter Text).
// Leitet daraus einen Build ab: Klasse, Base-Level, Job-Wechsel-Level, Stats und Skill-Level.
// Robust gegen das Tab-getrennte Copy-&-Paste-Format des CP.

import type { Build, Stats, StatKey } from './types'
import { STATS } from './types'
import { CLASSES } from './ro/classes'
import { skillsForClass } from './ro/skills'

// Klassenname (wie im CP) -> Klassen-ID. Case-insensitiv über die Registry.
const NAME_TO_ID = new Map(CLASSES.map((c) => [c.name.toLowerCase(), c.id]))

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Parst den eingefügten Arcadia-CP-Charakterseiten-Text. Null, wenn es kein CP-Text ist
 *  oder die Klasse nicht erkannt wird. */
export function decodeArcadiaCpToBuild(input: string): Build | null {
  const text = input.replace(/\r/g, '')
  // Nur greifen, wenn es nach der CP-Charakterseite aussieht.
  if (!/Job Class/.test(text) || !/Skill Name/i.test(text)) return null

  const className = text.match(/^Job Class\s+(.+?)\s*$/m)?.[1]?.trim()
  if (!className) return null
  const classId = NAME_TO_ID.get(className.toLowerCase())
  if (!classId) return null

  const lvl = text.match(/^Level\s+(\d+)\s*\/\s*(\d+)/m)
  const baseLevel = clamp(lvl ? Number(lvl[1]) : 1, 1, 99)
  const jobLevel = clamp(lvl ? Number(lvl[2]) : 1, 1, 99)
  const jobChange = text.match(/Jobchange Level\s+(\d+)/)
  const earlyJobChangeLevel = clamp(jobChange ? Number(jobChange[1]) : 50, 40, 50)

  // Stats (Base-Werte aus dem CP).
  const stats = { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 } as Stats
  for (const key of STATS) {
    const m = text.match(new RegExp(`^${key}\\s+(\\d[\\d,]*)`, 'm'))
    if (m) stats[key as StatKey] = clamp(Number(m[1].replace(/,/g, '')), 1, 999)
  }

  // Skills: Zeilen wie "AC_OWL Owl's Eye \t 10" oder "NV_FIRSTAID (Quest) First Aid \t 1".
  // Nur Skills übernehmen, die zur Klasse gehören (unbekannte/Fremde ignorieren).
  const maxById = new Map(skillsForClass(classId).map((s) => [s.id, s.maxLevel]))
  const skills: Record<string, number> = {}
  for (const line of text.split('\n')) {
    const idm = line.match(/^([A-Z]{2,}_[A-Z0-9_]+)\b/)
    if (!idm) continue
    const id = idm[1]
    const max = maxById.get(id)
    if (max == null) continue
    const lm = line.match(/(\d+)\s*$/)
    if (!lm) continue
    const lvlN = clamp(Number(lm[1]), 0, max)
    if (lvlN > 0) skills[id] = lvlN
  }

  const charName =
    text.match(/Viewing Character\s*\(([^)]+)\)/)?.[1]?.trim() ||
    text.match(/^Name\s+(?:\(Offline\)\s*)?(.+?)\s*$/m)?.[1]?.trim() ||
    className

  return {
    id: '',
    name: `${charName} (CP-Import)`,
    classId,
    charLink: '',
    notes: '',
    groupIds: [],
    earlyJobChangeLevel,
    milestones: [
      {
        id: '',
        label: 'Import',
        baseLevel,
        jobLevel,
        stats,
        skills,
      },
    ],
    createdAt: '',
    updatedAt: '',
  }
}
