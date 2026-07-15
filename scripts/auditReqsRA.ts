// Audit gegen die AUTHORITATIVE Pre-Renewal-Quelle: rAthena db/pre-re/skill_tree.yml
// (unsere Daten stammen von dort). Meldet Abweichungen der Voraussetzungen. NV_BASIC (unsere
// synthetische Job-Wechsel-Voraussetzung) wird ignoriert.

import { CLASSES } from '../src/ro/classes'
import { skillsForClass } from '../src/ro/skills'

const IGNORE = new Set(['NV_BASIC'])

// Unsere Voraussetzungen je Skill-ID.
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

// rAthena YAML zeilenbasiert parsen (feste 2er-Einrückung).
const yml = await (
  await fetch('https://raw.githubusercontent.com/rathena/rathena/master/db/pre-re/skill_tree.yml')
).text()
const raReqs = new Map<string, Map<string, number>>()
const declared = new Set<string>() // nur die ERSTE (besitzende) Job-Deklaration je Skill zählt
let curSkill: string | null = null
let inReq = false
let pendingReq: string | null = null
for (const line of yml.split('\n')) {
  let m = /^ {6}- Name: (\S+)/.exec(line)
  if (m) {
    // Spätere Job-Bäume überschreiben geerbte Skills mit job-spezifischen Voraussetzungen –
    // die ignorieren wir, denn unser Modell hat eine Voraussetzungsmenge je Skill (Besitzerklasse).
    if (declared.has(m[1])) {
      curSkill = null
      inReq = false
      pendingReq = null
      continue
    }
    declared.add(m[1])
    curSkill = m[1]
    raReqs.set(m[1], new Map())
    inReq = false
    pendingReq = null
    continue
  }
  if (/^ {8}Requires:/.test(line)) {
    inReq = true
    if (curSkill && !raReqs.has(curSkill)) raReqs.set(curSkill, new Map())
    continue
  }
  if (inReq && curSkill) {
    m = /^ {10}- Name: (\S+)/.exec(line)
    if (m) {
      pendingReq = m[1]
      continue
    }
    m = /^ {12}Level: (\d+)/.exec(line)
    if (m && pendingReq) {
      const map = raReqs.get(curSkill)!
      map.set(pendingReq, Math.max(map.get(pendingReq) ?? 0, Number(m[1])))
      pendingReq = null
      continue
    }
    if (/^ {0,7}\S/.test(line) || /^ {6}- /.test(line)) inReq = false
  }
}

let issues = 0
const lines: string[] = []
for (const skillId of [...ourReqs.keys()].sort()) {
  if (!raReqs.has(skillId)) continue // Skill nicht in rAthena pre-re (z.B. Custom-Platin) -> überspringen
  const ours = ourReqs.get(skillId)!
  const ra = raReqs.get(skillId)!
  const keys = new Set([...ours.keys(), ...ra.keys()])
  const diffs: string[] = []
  for (const k of keys) {
    const o = ours.get(k)
    const r = ra.get(k)
    if (o === r) continue
    const nm = ourName.get(k) ?? k
    if (o === undefined) diffs.push(`  + fehlt bei uns: ${nm} (${k}) Lv${r}`)
    else if (r === undefined) diffs.push(`  - zu viel bei uns: ${nm} (${k}) Lv${o}`)
    else diffs.push(`  ~ Level: ${nm} (${k}) uns=${o} rAthena=${r}`)
  }
  if (diffs.length) {
    issues++
    lines.push(`● ${ourName.get(skillId) ?? skillId} (${skillId}):`)
    lines.push(...diffs)
  }
}
console.log(lines.join('\n'))
console.log(
  `\n${issues} Skills mit Abweichungen (von ${[...ourReqs.keys()].filter((id) => raReqs.has(id)).length} gegen rAthena geprüft).`,
)
