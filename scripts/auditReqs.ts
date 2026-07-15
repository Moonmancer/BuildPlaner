// Audit: vergleicht die Skill-Voraussetzungen unserer Daten (src/ro/skills.ts) mit der
// himeyasha-skill7-Quelle. Dort kodiert jede Funktion CODE_F() ihre Voraussetzungen als
// Auto-Set-Zeilen `if(REQ_P<N && CODE_P>0){ REQ_P=N; ... }`. Wir extrahieren diese, mappen die
// Codes auf Skill-IDs und melden Abweichungen (fehlend / zu viel / anderes Level).
// NV_BASIC (unsere synthetische Job-Wechsel-Voraussetzung) und JCHF werden ignoriert.

import { HIME_SLUG_TO_CLASS, HIME_CODE_TO_SKILL } from '../src/himeyashaData'
import { CLASSES } from '../src/ro/classes'
import { skillsForClass } from '../src/ro/skills'

const IGNORE = new Set(['NV_BASIC'])

// Unsere Voraussetzungen je Skill-ID (aus allen Klassenbäumen, erste Fundstelle).
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

// himeyasha-Voraussetzungen je Skill-ID (Union über alle Seiten, max Level).
const himeReqs = new Map<string, Map<string, number>>()
const seenHime = new Set<string>()
for (const [slug] of Object.entries(HIME_SLUG_TO_CLASS)) {
  let html: string
  try {
    html = await (await fetch(`https://irowiki.org/~himeyasha/skill7/${slug}.html`)).text()
  } catch {
    continue
  }
  // Funktionen CODE_F(){ ... } isolieren.
  const fnRe = /function\s+([A-Z0-9]+)_F\s*\(\)\s*\{([\s\S]*?)\n\}/g
  let fm: RegExpExecArray | null
  while ((fm = fnRe.exec(html))) {
    const code = fm[1]
    const body = fm[2]
    const skillId = HIME_CODE_TO_SKILL[code]
    if (!skillId) continue
    seenHime.add(skillId)
    const reqRe = new RegExp(`if\\(\\s*([A-Z0-9]+)_P<(\\d+)\\s*&&\\s*${code}_P>0`, 'g')
    let rm: RegExpExecArray | null
    const reqs = himeReqs.get(skillId) ?? new Map<string, number>()
    while ((rm = reqRe.exec(body))) {
      const reqCode = rm[1]
      const lvl = Number(rm[2])
      if (reqCode === 'JCHF') continue
      const reqId = HIME_CODE_TO_SKILL[reqCode]
      if (!reqId || IGNORE.has(reqId)) continue
      reqs.set(reqId, Math.max(reqs.get(reqId) ?? 0, lvl))
    }
    himeReqs.set(skillId, reqs)
  }
}

// Vergleich nur für Skills, die auf einer himeyasha-Seite vorkamen und die wir kennen.
let issues = 0
const lines: string[] = []
for (const skillId of [...seenHime].sort()) {
  if (!ourReqs.has(skillId)) continue
  const ours = ourReqs.get(skillId)!
  const hime = himeReqs.get(skillId)!
  const keys = new Set([...ours.keys(), ...hime.keys()])
  const diffs: string[] = []
  for (const k of keys) {
    const o = ours.get(k)
    const h = hime.get(k)
    if (o === h) continue
    const nm = ourName.get(k) ?? k
    if (o === undefined) diffs.push(`  + fehlt bei uns: ${nm} (${k}) Lv${h}`)
    else if (h === undefined) diffs.push(`  - zu viel bei uns: ${nm} (${k}) Lv${o}`)
    else diffs.push(`  ~ Level: ${nm} (${k}) uns=${o} hime=${h}`)
  }
  if (diffs.length) {
    issues++
    lines.push(`● ${ourName.get(skillId) ?? skillId} (${skillId}):`)
    lines.push(...diffs)
  }
}

console.log(lines.join('\n'))
console.log(`\n${issues} Skills mit Abweichungen (von ${seenHime.size} himeyasha-Skills geprüft).`)
