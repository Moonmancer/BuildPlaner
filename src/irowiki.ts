// Import aus skills.irowiki.org (Phase 5, NUR Import).
// Format: ?job=<Name>&build=<base64url>. build = Bit-Strom (MSB-first):
//   14 Bit job_id, 1 Bit ro_mode, dann je 14 Bit skill_id + 7 Bit level (Standard-RO-IDs),
//   solange >=21 Bit übrig. Nur Skills (keine Stats/Level). Siehe [[irowiki-url-format]].

import type { Build } from './types'
import { emptyStats } from './types'
import { CLASSES, getClass } from './ro/classes'
import { skillsForClass } from './ro/skills'
import { RO_ID_TO_SKILL } from './roSkillIds'

// Job-Name (irowiki, iRO-Englisch) -> unsere classId. Normalisiert + wenige Aliase.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const NAME_TO_CLASS: Record<string, string> = {}
for (const c of CLASSES) NAME_TO_CLASS[norm(c.name)] = c.id
const ALIAS: Record<string, string> = {
  swordman: 'swordsman',
  magician: 'mage',
  taekwon: 'taekwon',
  minstrel: 'clown',
  scholar: 'professor',
  biochemist: 'creator',
}

function jobNameToClassId(name: string | null): string | null {
  if (!name) return null
  const n = norm(name)
  return ALIAS[n] ?? NAME_TO_CLASS[n] ?? null
}

function paramFrom(input: string, key: string): string | null {
  const m = input.match(new RegExp('[?&]' + key + '=([^&#]+)'))
  return m ? decodeURIComponent(m[1]) : null
}

/** Dekodiert das build-Bitfeld zu { roSkillId: level }. */
function decodeBuild(b64url: string): Record<number, number> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    return {}
  }
  const bits: number[] = []
  for (let i = 0; i < bin.length; i++) {
    const byte = bin.charCodeAt(i)
    for (let k = 7; k >= 0; k--) bits.push((byte >> k) & 1)
  }
  let pos = 0
  const read = (n: number) => {
    let v = 0
    for (let i = 0; i < n && pos < bits.length; i++) v = (v << 1) | bits[pos++]
    return v
  }
  read(14) // job_id (ignoriert – wir nutzen den ?job=-Namen)
  read(1) // ro_mode
  const skills: Record<number, number> = {}
  while (bits.length - pos >= 21) {
    const id = read(14)
    const lvl = read(7)
    if (lvl > 0) skills[id] = lvl
  }
  return skills
}

/** Baut aus einem irowiki-Link einen (Inhalts-)Build (nur Skills). Null wenn ungültig. */
export function decodeIrowikiToBuild(input: string): Build | null {
  const build = paramFrom(input, 'build')
  if (!build) return null
  const classId = jobNameToClassId(paramFrom(input, 'job'))
  const raw = decodeBuild(build)
  // roId -> unsere Skill-ID; optional auf den Klassenbaum filtern.
  const allowed = classId ? new Set(skillsForClass(classId).map((s) => s.id)) : null
  const skills: Record<string, number> = {}
  for (const [idStr, lvl] of Object.entries(raw)) {
    const our = RO_ID_TO_SKILL[Number(idStr)]
    if (our && (!allowed || allowed.has(our))) skills[our] = lvl
  }
  if (Object.keys(skills).length === 0 && classId === null) return null
  const cls = getClass(classId)
  return {
    id: '',
    name: `${cls?.name ?? 'iRO'} (irowiki-Import)`,
    classId,
    charLink: '',
    notes: '',
    groupIds: [],
    earlyJobChangeLevel: 50,
    // irowiki speichert keine Stats/Level – Level auf Max, damit die Skills ins Budget passen.
    milestones: [{
      id: '',
      label: 'Import',
      baseLevel: 99,
      jobLevel: cls?.maxJobLevel ?? 70,
      stats: emptyStats(),
      skills,
    }],
    createdAt: '',
    updatedAt: '',
  }
}
