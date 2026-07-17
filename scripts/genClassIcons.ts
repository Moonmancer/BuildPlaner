// Spiegelt die Klassen-Portraits von himeyasha nach public/class-icons/<code>.png (einmalig,
// Ergebnis wird mitcommittet). Aufruf: rolldown bundelt + node führt aus (Netzwerkzugriff nötig).
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ALL_ICON_CODES } from '../src/classIcons'

const OUT = resolve(process.cwd(), 'public/class-icons')
mkdirSync(OUT, { recursive: true })

let ok = 0
const failed: string[] = []
for (const code of ALL_ICON_CODES) {
  try {
    const r = await fetch(`https://irowiki.org/~himeyasha/skill7/img/chr/${code}.png`)
    if (!r.ok) {
      failed.push(`${code} (HTTP ${r.status})`)
      continue
    }
    const buf = Buffer.from(await r.arrayBuffer())
    writeFileSync(resolve(OUT, `${code}.png`), buf)
    ok++
  } catch (e) {
    failed.push(`${code} (${(e as Error).message})`)
  }
}
console.log(`class-icons: ${ok}/${ALL_ICON_CODES.length} geladen`)
if (failed.length) console.log('FEHLGESCHLAGEN:', failed.join(', '))
