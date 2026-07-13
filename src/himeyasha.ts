// Import aus irowiki.org/~himeyasha/skill7 (Phase 5, NUR Import).
// URL: <slug>.html?<code>. Codec: Version weg (bis inkl. erste '0'), Ziffer d -> (d+1)×'a',
// je 2 Zeichen Base52 -> 3 Level (Basis 13). Reihenfolge = tdata der Job-Seite.
// Siehe [[himeyasha-url-format]] / [[phase5-resume]].

import type { Build } from './types'
import { emptyStats } from './types'
import { getClass } from './ro/classes'
import { skillsForClass } from './ro/skills'
import { HIME_SLUG_TO_CLASS, HIME_JOB_CODES, HIME_CODE_TO_SKILL } from './himeyashaData'

const A52 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Code -> tdata (Level-Array). */
function decodeCode(code: string): number[] {
  const z = code.indexOf('0')
  let s = z >= 0 ? code.slice(z + 1) : code
  s = s.replace(/\d/g, (d) => 'a'.repeat(Number(d) + 1))
  const tdata: number[] = []
  for (let i = 0; i + 1 < s.length; i += 2) {
    const x = A52.indexOf(s[i])
    const y = A52.indexOf(s[i + 1])
    if (x < 0 || y < 0) continue
    const tmp = x * 52 + y
    tdata.push(Math.floor(tmp / 169), Math.floor((tmp % 169) / 13), tmp % 13)
  }
  return tdata
}

// Dateiname als Slug – deckt beide Hosts ab: irowiki.org/~himeyasha/skill7/<slug>.html
// und oldskillsim.irowiki.org/<slug>.html. Der Slug muss in HIME_JOB_CODES existieren.
const slugFrom = (i: string) =>
  (i.match(/(?:^|\/)([a-z0-9_]+)\.html/i)?.[1] ?? '').toLowerCase() || null
const codeFrom = (i: string) => i.match(/\?([0-9A-Za-z]+)/)?.[1] ?? null

/** Baut aus einem himeyasha-Link einen (Inhalts-)Build (nur Skills). Null wenn ungültig. */
export function decodeHimeyashaToBuild(input: string): Build | null {
  const slug = slugFrom(input)
  const code = codeFrom(input)
  if (!slug || !code) return null
  const codes = HIME_JOB_CODES[slug]
  if (!codes) return null
  const classId = HIME_SLUG_TO_CLASS[slug] ?? null
  const tdata = decodeCode(code)
  const allowed = classId ? new Set(skillsForClass(classId).map((s) => s.id)) : null
  const skills: Record<string, number> = {}
  for (let i = 0; i < codes.length && i < tdata.length; i++) {
    const c = codes[i]
    const lvl = tdata[i]
    if (!c || lvl <= 0) continue
    const our = HIME_CODE_TO_SKILL[c]
    if (our && (!allowed || allowed.has(our))) skills[our] = lvl
  }
  if (Object.keys(skills).length === 0 && classId === null) return null
  const cls = getClass(classId)
  return {
    id: '',
    name: `${cls?.name ?? 'RO'} (himeyasha-Import)`,
    classId,
    charLink: '',
    notes: '',
    groupIds: [],
    earlyJobChangeLevel: 50,
    milestones: [{
      id: '', label: 'Import', baseLevel: 99,
      jobLevel: cls?.maxJobLevel ?? 70, stats: emptyStats(), skills,
    }],
    createdAt: '', updatedAt: '',
  }
}
