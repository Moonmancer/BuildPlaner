// Generiert src/treeGrid2.ts: pro Klasse die Skill-Anordnung (Spalte/Zeile) aus den
// himeyasha-skill7-Diagrammen (irowiki.org/~himeyasha/skill7/<slug>.html). Dort ist jeder Skill
// eine absolut positionierte <table class="job" id="CODE" style="top:..;left:..">. Wir ranken die
// distinct-Positionen zu einem sauberen Raster. Platin-/Quest-Skills (class="quest") lassen wir
// weg – sie haben keine Pfeile und landen im „Ohne Abhängigkeiten"-Band.
//
// Aufruf (package.json "gen:treegrid"): rolldown bundelt + node führt aus (Netzwerkzugriff nötig).

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HIME_SLUG_TO_CLASS, HIME_CODE_TO_SKILL } from '../src/himeyashaData'
import { skillsForClass } from '../src/ro/skills'
import { TREE_GRID_OVERRIDES } from '../src/treeGridOverrides'

// Zusätzliche Layout-Slugs jenseits der Import-Map (nur fürs Raster; werden ignoriert, falls leer).
const EXTRA_SLUGS: Record<string, string> = { tae: 'taekwon' }
// First Classes haben keine eigene Seite – aus der jeweiligen 2nd-Class-Seite ableiten
// (skillsForClass filtert auf die zur Klasse gehörenden Skills).
const DERIVE: Record<string, string> = {
  swordsman: 'knt',
  mage: 'wiz',
  archer: 'hnt',
  merchant: 'bsm',
  thief: 'ass',
  acolyte: 'pri',
}

const slugToClass: Record<string, string> = { ...HIME_SLUG_TO_CLASS, ...EXTRA_SLUGS }

type Tbl = { code: string; left: number; top: number }
const pageCache = new Map<string, Tbl[]>()

async function tables(slug: string): Promise<Tbl[]> {
  if (!pageCache.has(slug)) {
    const res = await fetch(`https://irowiki.org/~himeyasha/skill7/${slug}.html`)
    const html = await res.text()
    const out: Tbl[] = []
    const re = /<table\s+class="job"\s+id="([A-Z0-9]+)"[^>]*style="([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html))) {
      const t = /top:\s*(\d+)px/.exec(m[2])
      const l = /left:\s*(\d+)px/.exec(m[2])
      if (t && l) out.push({ code: m[1], left: Number(l[1]), top: Number(t[1]) })
    }
    pageCache.set(slug, out)
  }
  return pageCache.get(slug)!
}

// Distinct-Positionen zu Rasterindizes ranken (kompakt, Reihenfolge & gleiche Höhen bleiben).
function toGrid(entries: { skillId: string; left: number; top: number }[]) {
  const lefts = [...new Set(entries.map((e) => e.left))].sort((a, b) => a - b)
  const tops = [...new Set(entries.map((e) => e.top))].sort((a, b) => a - b)
  const colOf = new Map(lefts.map((v, i) => [v, i]))
  const rowOf = new Map(tops.map((v, i) => [v, i]))
  const g: Record<string, { col: number; row: number }> = {}
  for (const e of entries) g[e.skillId] = { col: colOf.get(e.left)!, row: rowOf.get(e.top)! }
  return g
}

async function build(classId: string, slug: string) {
  const members = new Set(skillsForClass(classId).map((s) => s.id))
  const entries = (await tables(slug))
    .map((t) => ({ skillId: HIME_CODE_TO_SKILL[t.code], left: t.left, top: t.top }))
    .filter((e) => e.skillId && members.has(e.skillId))
  return entries.length ? toGrid(entries) : null
}

const OUT: Record<string, Record<string, { col: number; row: number }>> = {}
for (const [slug, classId] of Object.entries(slugToClass)) {
  try {
    const g = await build(classId, slug)
    if (g) OUT[classId] = g
  } catch (e) {
    console.warn(`Slug ${slug} (${classId}) fehlgeschlagen:`, (e as Error).message)
  }
}
for (const [classId, slug] of Object.entries(DERIVE)) {
  try {
    const g = await build(classId, slug)
    if (g) OUT[classId] = g
  } catch (e) {
    console.warn(`Derive ${classId} <- ${slug} fehlgeschlagen:`, (e as Error).message)
  }
}

// Manuelle Korrekturen ZULETZT über das generierte Raster legen (überleben so ein Neugenerieren).
for (const [classId, cells] of Object.entries(TREE_GRID_OVERRIDES)) {
  OUT[classId] = OUT[classId] ?? {}
  for (const [skillId, [col, row]] of Object.entries(cells)) {
    OUT[classId][skillId] = { col, row }
  }
}

const body = Object.entries(OUT)
  .map(([cid, g]) => {
    const cells = Object.entries(g)
      .map(([sid, p]) => `${JSON.stringify(sid)}:[${p.col},${p.row}]`)
      .join(',')
    return `  ${JSON.stringify(cid)}: {${cells}},`
  })
  .join('\n')

const file = `// AUTO-GENERIERT von scripts/genTreeGrid.ts (npm run gen:treegrid).
// Skill-Anordnung je Klasse aus den himeyasha-skill7-Diagrammen: [Spalte, Zeile] je Skill.
// Die Baum-Ansicht setzt die Knoten auf dieses Raster; Skills ohne Eintrag (Platin/Quest, Novice-
// Basis) landen im „Ohne Abhängigkeiten"-Band. Neugenerieren überschreibt gezielte Handkorrekturen.

export type GridCell = readonly [col: number, row: number]

export const TREE_GRID2: Record<string, Record<string, GridCell>> = {
${body}
}
`

writeFileSync(resolve(process.cwd(), 'src/treeGrid2.ts'), file)
console.log(`treeGrid2.ts geschrieben: ${Object.keys(OUT).length} Klassen`)
