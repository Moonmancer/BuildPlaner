// Generiert src/treeOrder.ts: pro Klasse die kreuzungs-optimierte Skill-Reihenfolge für die
// Baum-Ansicht. Wird einmalig (bzw. nach Skill-Datenänderungen) ausgeführt; das Ergebnis wird
// committet, damit der Baum stabil und ohne Laufzeit-Optimierung angezeigt wird.
//
// Aufruf (siehe package.json "gen:tree"):
//   rolldown scripts/genTreeOrder.ts -o <tmp> -f esm -p node  &&  node <tmp>

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CLASSES } from '../src/ro/classes'
import { skillsForClass } from '../src/ro/skills'
import { buildTreeGraph } from '../src/ro/treeLayout'

const out: Record<string, string[]> = {}
for (const c of CLASSES) {
  const available = skillsForClass(c.id)
  if (available.length === 0) continue
  const g = buildTreeGraph(available, c.id)
  out[c.id] = [...g.layers.flat(), ...g.isolated]
}

const body = Object.entries(out)
  .map(([id, ids]) => `  ${JSON.stringify(id)}: ${JSON.stringify(ids)},`)
  .join('\n')

const file = `// AUTO-GENERIERT von scripts/genTreeOrder.ts – nicht global von Hand editieren.
// Pro Klasse die vorab optimierte, verifizierte Reihenfolge der Skills für die Baum-Ansicht
// (flache Liste: Ebenen von links nach rechts, isolierte Skills zuletzt). Das UI sortiert die
// Skills der Klasse anhand dieser Reihenfolge ein – so ist der Baum stabil und ohne
// Laufzeit-Optimierung. Gezielte Feinjustage einzelner Klassen ist erlaubt (Neugenerieren
// überschreibt sie wieder).

export const TREE_ORDER: Record<string, readonly string[]> = {
${body}
}
`

const target = resolve(process.cwd(), 'src/treeOrder.ts')
writeFileSync(target, file)
console.log(`treeOrder.ts geschrieben: ${Object.keys(out).length} Klassen`)
