// Audit gegen HerculesWS/Hercules db/pre-re/skill_tree.conf (Pre-Renewal).
// Hercules-Format je Job:  skills: { SKILL: maxlvl  |  SKILL: { MaxLevel: n  REQ_SKILL: lvl ... } }
// D.h. innerhalb eines Skill-Objekts sind alle Schlüssel außer MaxLevel Voraussetzungen.
// Verglichen wird die ERSTE (besitzende) Deklaration je Skill; NV_BASIC (synthetisch) ignoriert.

import { CLASSES } from '../src/ro/classes'
import { skillsForClass } from '../src/ro/skills'

const IGNORE = new Set(['NV_BASIC'])

const ourReqs = new Map<string, Map<string, number>>()
const ourName = new Map<string, string>()
for (const c of CLASSES) {
  for (const s of skillsForClass(c.id)) {
    if (ourReqs.has(s.id)) continue
    ourName.set(s.id, s.name)
    ourReqs.set(
      s.id,
      new Map(s.requires.filter((r) => !IGNORE.has(r.id)).map((r) => [r.id, r.level])),
    )
  }
}

const conf = await (
  await fetch(
    'https://raw.githubusercontent.com/HerculesWS/Hercules/master/db/pre-re/skill_tree.conf',
  )
).text()

type Ctx = { type: 'job' | 'skills' | 'skill' | 'other'; name?: string; ignore?: boolean }
const stack: Ctx[] = []
const declared = new Set<string>()
const hReqs = new Map<string, Map<string, number>>()

const cleaned = conf.replace(/\/\*[\s\S]*?\*\//g, '') // Block-Kommentare entfernen
for (const rawLine of cleaned.split('\n')) {
  const t = rawLine.split('//')[0].trim()
  if (!t) continue
  if (t.startsWith('}')) {
    stack.pop()
    continue
  }
  const open = /^"?([A-Za-z0-9_]+)"?\s*:\s*\{$/.exec(t)
  if (open) {
    const name = open[1]
    const top = stack[stack.length - 1]
    if (stack.length === 0) stack.push({ type: 'job', name })
    else if (name === 'skills' && top?.type === 'job') stack.push({ type: 'skills' })
    else if (top?.type === 'skills') {
      const first = !declared.has(name)
      if (first) {
        declared.add(name)
        hReqs.set(name, new Map())
      }
      stack.push({ type: 'skill', name, ignore: !first })
    } else stack.push({ type: 'other', name })
    continue
  }
  const scalar = /^"?([A-Za-z0-9_]+)"?\s*:\s*(\d+),?$/.exec(t)
  if (scalar) {
    const key = scalar[1]
    const val = Number(scalar[2])
    const top = stack[stack.length - 1]
    if (top?.type === 'skills') {
      if (!declared.has(key)) {
        declared.add(key)
        hReqs.set(key, new Map())
      }
    } else if (top?.type === 'skill' && !top.ignore) {
      if (key !== 'MaxLevel' && key !== 'MinJobLevel')
        hReqs.get(top.name!)!.set(key, val)
    }
    continue
  }
}

let issues = 0
const lines: string[] = []
for (const skillId of [...ourReqs.keys()].sort()) {
  if (!hReqs.has(skillId)) continue
  const ours = ourReqs.get(skillId)!
  const h = hReqs.get(skillId)!
  const keys = new Set([...ours.keys(), ...h.keys()])
  const diffs: string[] = []
  for (const k of keys) {
    const o = ours.get(k)
    const r = h.get(k)
    if (o === r) continue
    const nm = ourName.get(k) ?? k
    if (o === undefined) diffs.push(`  + fehlt bei uns: ${nm} (${k}) Lv${r}`)
    else if (r === undefined) diffs.push(`  - zu viel bei uns: ${nm} (${k}) Lv${o}`)
    else diffs.push(`  ~ Level: ${nm} (${k}) uns=${o} hercules=${r}`)
  }
  if (diffs.length) {
    issues++
    lines.push(`● ${ourName.get(skillId) ?? skillId} (${skillId}):`)
    lines.push(...diffs)
  }
}
console.log(lines.join('\n'))
console.log(
  `\n${issues} Skills mit Abweichungen (von ${[...ourReqs.keys()].filter((id) => hReqs.has(id)).length} gegen Hercules geprüft).`,
)
