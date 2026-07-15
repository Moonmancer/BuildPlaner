import { type CSSProperties, useMemo, useState } from 'react'
import type { SkillLevels } from '../types'
import { getClass, classChain } from '../ro/classes'
import { ALT_NAMES } from '../altNames'

/** Zeigt den Skillnamen; bei inhaltlich abweichenden Alternativnamen (Hercules/rAthena)
 *  als Suffix „(Alt: …)". Rein formatierte Varianten (normalisiert gleich) werden weggelassen. */
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
function displayName(id: string, name: string): string {
  const seen = new Set([normName(name)])
  const alts: string[] = []
  for (const a of ALT_NAMES[id] ?? []) {
    const k = normName(a)
    if (!seen.has(k)) {
      seen.add(k)
      alts.push(a)
    }
  }
  return alts.length ? `${name} (Alt: ${alts.join(', ')})` : name
}
import {
  skillsForClass,
  lowerSkill,
  skillPoints,
  skillPool,
  poolLabels,
  learnSkill,
  type SkillDef,
  type PoolInfo,
} from '../ro/skills'
import { SKILL_GRID, GRID_COLS } from '../skillGrid'
import { RO_ID_TO_SKILL } from '../roSkillIds'
import { loadSkillView, saveSkillView, type SkillView } from '../storage'
import { buildTreeGraph } from '../ro/treeLayout'
import { TREE_ORDER } from '../treeOrder'
import { TREE_GRID2 } from '../treeGrid2'

// Skill-Icons liegen lokal unter public/skill-icons/<ID>.png (offline-tauglich):
//  - Standard-Skills: gespiegelt von db.irowiki.org (IDs mit RO-Nummer).
//  - Server-spezifische Platin-Skills (Arcadia): von wiki.arcadia-online.org.
const SKILL_TO_RO_ID: Record<string, number> = {}
for (const [num, id] of Object.entries(RO_ID_TO_SKILL)) SKILL_TO_RO_ID[id] = Number(num)
const CUSTOM_ICON_IDS = new Set([
  'GS_SIEGESTANCE',
  'GS_ENFEEBLEROUND',
  'GS_BLASTROUND',
  'NJ_METSUBUSHI',
  'NJ_TAIJUTSU',
  'SG_NOVA',
  'SL_KASHU',
  'SL_WEAVESELF',
  'TK_VIRTUES',
])
const iconUrl = (id: string) =>
  CUSTOM_ICON_IDS.has(id) || SKILL_TO_RO_ID[id]
    ? `${import.meta.env.BASE_URL}skill-icons/${id}.png`
    : null

// Universelle Voraussetzung (Jobwechsel) – bei Hover-Hervorhebung & Baum-Linien ausgenommen.
const ARROW_EXCLUDE = 'NV_BASIC'

// Verbindungslinie im Baum: rechtwinkliger Pfad Voraussetzung -> Folge-Skill + benötigtes Level.
interface Edge {
  points: Array<[number, number]>
  lx: number
  ly: number
  level: number
  from: string
  to: string
}

interface Props {
  classId: string | null
  levels: SkillLevels
  earlyJobChangeLevel: number
  onChange: (levels: SkillLevels) => void
}

/** Skill-Baum eines Builds: umschaltbar zwischen Listen- und Ingame-Ansicht.
 *  Beim Erhöhen werden benötigte Vor-Skills automatisch mitgelernt.
 *  Skillpunkt-Budget je Tier (Novice / First / Second), 1 Job-Level je Punkt. */
export function SkillTree({
  classId,
  levels,
  earlyJobChangeLevel,
  onChange,
}: Props) {
  const [view, setView] = useState<SkillView>(() => loadSkillView())
  // Umschalten + Präferenz in localStorage merken.
  const changeView = (v: SkillView) => {
    setView(v)
    saveSkillView(v)
  }
  const available = useMemo(() => skillsForClass(classId), [classId])
  const availById = useMemo(
    () => new Map(available.map((s) => [s.id, s])),
    [available],
  )

  // Transitive Reduktion des Voraussetzungs-Graphen: Eine direkte Voraussetzung B wird als „direkt"
  // verworfen, wenn sie ohnehin über eine andere Voraussetzung C (auf mind. gleichem Level)
  // erzwungen wird. So erscheint z.B. Provoke nicht als direkte Voraussetzung von Relax (die nur
  // Endure+HP-Rec verlangt), sondern nur indirekt über Endure. Pfeile & „direkt"-Hervorhebung
  // nutzen diese reduzierte Menge; Auto-Lernen/Validierung weiterhin die vollen requires.
  const reducedReqs = useMemo(() => {
    const filt = (s: SkillDef) =>
      s.requires.filter((r) => r.id !== ARROW_EXCLUDE && availById.has(r.id))
    // Garantierte Voraussetzungs-Level, wenn man `id` besitzt (transitiv, je Skill max-Level).
    const cache = new Map<string, Map<string, number>>()
    const closureOf = (id: string): Map<string, number> => {
      const hit = cache.get(id)
      if (hit) return hit
      const res = new Map<string, number>()
      cache.set(id, res) // früh setzen (Zyklusschutz; der Graph ist azyklisch)
      const sk = availById.get(id)
      if (sk) {
        for (const r of filt(sk)) {
          res.set(r.id, Math.max(res.get(r.id) ?? 0, r.level))
          for (const [k, v] of closureOf(r.id)) res.set(k, Math.max(res.get(k) ?? 0, v))
        }
      }
      return res
    }
    const map = new Map<string, { id: string; level: number }[]>()
    for (const s of available) {
      const reqs = filt(s)
      const kept = reqs.filter(
        (b) =>
          !reqs.some((c) => c.id !== b.id && (closureOf(c.id).get(b.id) ?? 0) >= b.level),
      )
      map.set(s.id, kept)
    }
    return map
  }, [available, availById])

  const points = skillPoints(classId, levels, earlyJobChangeLevel)

  // Hover-Hervorhebung: der gehoverte Skill + seine Beziehungen (direkt UND indirekt/transitiv).
  const [hovered, setHovered] = useState<string | null>(null)
  const hoveredSkill =
    hovered && hovered !== ARROW_EXCLUDE ? availById.get(hovered) : undefined

  // Beziehungs-Info zum gehoverten Skill: direkte Voraussetzungen/Abhängige (mit Level) + die
  // transitiven Hüllen (indirekte Voraussetzungen/Abhängige) über den reduzierten Graphen.
  const hoverInfo = useMemo(() => {
    if (!hoveredSkill) return null
    const directReq = new Map(
      (reducedReqs.get(hoveredSkill.id) ?? []).map((r) => [r.id, r.level] as const),
    )
    const directDep = new Map<string, number>()
    const depAdj = new Map<string, string[]>()
    for (const s of available) {
      for (const r of reducedReqs.get(s.id) ?? []) {
        if (r.id === hoveredSkill.id) directDep.set(s.id, r.level)
        const arr = depAdj.get(r.id) ?? []
        arr.push(s.id)
        depAdj.set(r.id, arr)
      }
    }
    const reqClosure = new Set<string>()
    const up = [hoveredSkill.id]
    while (up.length) {
      const id = up.pop()!
      for (const r of reducedReqs.get(id) ?? []) {
        if (!reqClosure.has(r.id)) {
          reqClosure.add(r.id)
          up.push(r.id)
        }
      }
    }
    const depClosure = new Set<string>()
    const down = [hoveredSkill.id]
    while (down.length) {
      const id = down.pop()!
      for (const d of depAdj.get(id) ?? []) {
        if (!depClosure.has(d)) {
          depClosure.add(d)
          down.push(d)
        }
      }
    }
    return { directReq, directDep, reqClosure, depClosure }
  }, [hoveredSkill, available, reducedReqs])

  /** Beziehung einer Zelle zum gehoverten Skill: 'source' | 'req' | 'dep' – mit Level (direkt) und
   *  `indirect`-Flag (transitiv über die Kette erreichbar). NV_BASIC ausgenommen. */
  function relationOf(
    skill: SkillDef,
  ): { rel: 'source' | 'req' | 'dep'; level: number; indirect: boolean } | null {
    if (!hoverInfo || !hoveredSkill || skill.id === ARROW_EXCLUDE) return null
    if (skill.id === hoveredSkill.id) return { rel: 'source', level: 0, indirect: false }
    const dReq = hoverInfo.directReq.get(skill.id)
    if (dReq !== undefined) return { rel: 'req', level: dReq, indirect: false }
    const dDep = hoverInfo.directDep.get(skill.id)
    if (dDep !== undefined) return { rel: 'dep', level: dDep, indirect: false }
    if (hoverInfo.reqClosure.has(skill.id)) return { rel: 'req', level: 0, indirect: true }
    if (hoverInfo.depClosure.has(skill.id)) return { rel: 'dep', level: 0, indirect: true }
    return null
  }

  // Baum-Kanten-Hervorhebung: 2 = direkt am gehoverten Skill, 1 = auf der Voraussetzungs-/
  // Abhängigkeitskette (indirekt), 0 = unbeteiligt.
  const edgeRel = (e: Edge): 0 | 1 | 2 => {
    if (!hoverInfo || !hovered || hovered === ARROW_EXCLUDE) return 0
    if (e.from === hovered || e.to === hovered) return 2
    const { reqClosure, depClosure } = hoverInfo
    const up = reqClosure.has(e.from) && (reqClosure.has(e.to) || e.to === hovered)
    const down = depClosure.has(e.to) && (depClosure.has(e.from) || e.from === hovered)
    return up || down ? 1 : 0
  }

  // Baum-Ansicht. Bevorzugt das echte himeyasha-Raster (TREE_GRID2, Spalte/Zeile je Skill –
  // reproduziert die vertraute Ingame-Anordnung); ohne Raster-Daten Fallback auf das berechnete
  // Layout (buildTreeGraph + TREE_ORDER). Skills ohne Rasterplatz (Platin/Quest, Novice-Basis)
  // landen im „Ohne Abhängigkeiten"-Band. Der Router kennt drei Fälle: nach rechts (Regelfall),
  // vertikal (gleiche Spalte) und rückwärts (Ziel links).
  const NW = 150 // Knotenbreite
  const NH = 58 // Knotenhöhe
  const treeLayout = useMemo(() => {
    const CG = 112 // Spaltenabstand (breit genug für mehrere Lanes zwischen den Spalten)
    const RG = 30 // Zeilenabstand (Lücke groß genug, um Kanten hindurch zu routen)
    const PADY = RG // Rand oben/unten – Platz für Kanten, die in die Rand-Lücke routen
    const pos = new Map<string, { x: number; y: number }>()
    const col = new Map<string, number>()
    let isolatedIds: string[]

    const grid = TREE_GRID2[classId ?? '']
    if (grid) {
      for (const s of available) {
        const cell = grid[s.id]
        if (!cell) continue
        const [c, row] = cell
        pos.set(s.id, { x: c * (NW + CG), y: PADY + row * (NH + RG) })
        col.set(s.id, c)
      }
      isolatedIds = available.filter((s) => !grid[s.id]).map((s) => s.id)
    } else {
      const graph = buildTreeGraph(available, classId, TREE_ORDER[classId ?? ''])
      graph.layers.forEach((ids, l) =>
        ids.forEach((id, i) => {
          pos.set(id, { x: l * (NW + CG), y: PADY + i * (NH + RG) })
          col.set(id, l)
        }),
      )
      isolatedIds = graph.isolated
    }

    const mains = [...pos.values()]
    const mainWidth = mains.length ? Math.max(...mains.map((p) => p.x + NW)) : NW
    const mainHeight =
      (mains.length ? Math.max(...mains.map((p) => p.y + NH)) : NH) + PADY

    // Isolierte Skills (ohne Rasterplatz / ohne Verbindung) in ein eigenes Band unter den Baum.
    const isoSet = new Set(isolatedIds)
    const hasIsolated = isolatedIds.length > 0
    const isoCols = Math.max(1, Math.floor((mainWidth + CG) / (NW + CG)))
    const isoTop = mainHeight + RG // Abstand als Trenner zum Baum (ohne Beschriftung)
    isolatedIds.forEach((id, i) => {
      const c = i % isoCols
      const r = Math.floor(i / isoCols)
      pos.set(id, { x: c * (NW + CG), y: isoTop + r * (NH + RG) })
    })
    const isoRows = Math.ceil(isolatedIds.length / isoCols)
    const width = mainWidth
    const height = hasIsolated ? isoTop + isoRows * (NH + RG) - RG + PADY : mainHeight

    // Kanten. Regelfall (Ziel weiter rechts) in Phasen: (A) sammeln, (B) horizontale Lanes je
    // Zeilen-Lücke pro Quell-Skill, (C) vertikale Lanes je Spalte kollisionsfrei, (D) Polylinien.
    // Sonderfälle (gleiche Spalte / rückwärts) werden direkt über einen Seiten-Gutter geroutet.
    type Seg = {
      from: string
      to: string
      level: number
      x1: number
      y1: number
      entryY: number
      toX: number
      banded: boolean // true: Quellzeile durch Karte blockiert -> über eine Zeilen-Lücke routen
      simpleTurn: boolean // banded, aber Zielzeile nach dem Abbiegen frei -> ohne Band (2 Ecken)
      turnX: number // x, an dem die Kante die Quellzeile verlässt (Abbiegepunkt, mit Geschwistern geteilt)
      bandTop: number
      laneY: number
      xTrunk: number
    }
    const segs: Seg[] = []
    const directEdges: Edge[] = []
    // Vertikale Segmente der Sonderfälle (rückwärts/Gutter), die durch einen Spalten-Zwischenraum
    // laufen: werden in (C) mit denselben Trunk-Lanes gleichmäßig verteilt statt fest versetzt.
    // dir: +1 = liefert nach RECHTS (Vorwärts-Kante -> Ziel rechts), -1 = liefert nach LINKS
    // (Rückwärts/Gutter -> Ziel links). Rechts-liefernde Verticals belegen die rechten Lanes, links-
    // liefernde die linken; so teilen sich ein- und ausgehende Pfeile nie eine Lane / kreuzen nicht.
    type VSeg = { gapCol: number; lo: number; hi: number; from: string; dir: 1 | -1; set: (x: number) => void }
    const directVsegs: VSeg[] = []
    const gapColOf = (x: number) => Math.round(x / (NW + CG))
    // Skills je Spalte (für die Prüfung, ob eine gerade vertikale Verbindung eine Karte kreuzt).
    const columnMembers = new Map<number, { id: string; y: number }[]>()
    for (const s of available) {
      if (isoSet.has(s.id)) continue
      const c = col.get(s.id)
      const p = pos.get(s.id)
      if (c === undefined || !p) continue
      const arr = columnMembers.get(c) ?? []
      arr.push({ id: s.id, y: p.y })
      columnMembers.set(c, arr)
    }
    // Kanten in zwei Pässen. PASS 1: jede Kante klassifizieren (Familie + an welcher Kartenkante sie
    // ein-/austritt) und ihre Ports je Kartenkante sammeln. Danach werden die Ports je Kante GLEICH-
    // MÄSSIG verteilt (y-Bahnen an linker/rechter Kante, x-Bahnen an oberer/unterer). Gerade Linien
    // haben Vorrang: ihr Austritt wird an die (verteilte) Eintrittshöhe des Ziels gepinnt, auch wenn
    // er dadurch nicht mittig liegt. PASS 2: baut die Polylinien aus den aufgelösten Ports.
    type Fam = 'fwd' | 'vent' | 'samecol' | 'gutter' | 'back'
    interface EInfo {
      r: string
      s: string
      level: number
      cf: number
      ct: number
      dcol: number
      fx: number
      fy: number
      tx: number
      ty: number
      fam: Fam
      srcBelow: boolean
      entryY: number
      exitY: number
      entryX: number
      straight: boolean
    }
    const infos: EInfo[] = []
    // key = y des schlüsselgebenden Endpunkts (Quelle bei Eintritt, Ziel bei Austritt), key2 = dessen
    // x als Zweitschlüssel: bei gleichem y ordnet die weiter RECHTS liegende Karte nach oben.
    type YPort = { key: number; key2: number; pin: number | null; kind: 'in' | 'out'; apply: (y: number) => void }
    type XPort = { key: number; apply: (x: number) => void }
    const yBus = new Map<string, YPort[]>() // key `${id}:L|R` (eine Bahn je physischer Kartenkante)
    const xBus = new Map<string, XPort[]>() // key `${id}:T|B`
    const pushY = (bus: string, p: YPort) => {
      const a = yBus.get(bus) ?? []
      a.push(p)
      yBus.set(bus, a)
    }
    const pushX = (bus: string, p: XPort) => {
      const a = xBus.get(bus) ?? []
      a.push(p)
      xBus.set(bus, a)
    }
    // Steht in einer STRIKT zwischen lc und hc liegenden Spalte eine fremde Karte auf Höhe y?
    const colBlockedAtY = (lc: number, hc: number, y: number, rid: string, sid: string) =>
      [...columnMembers.entries()].some(
        ([c, ms]) =>
          c > lc &&
          c < hc &&
          ms.some((m) => m.id !== rid && m.id !== sid && m.y <= y && y <= m.y + NH),
      )

    // --- PASS 1: klassifizieren + Ports registrieren (Exit der fwd-Kanten folgt nach straight) ---
    for (const s of available) {
      if (s.id === ARROW_EXCLUDE || isoSet.has(s.id)) continue
      const to = pos.get(s.id)
      const ct = col.get(s.id)
      if (!to || ct === undefined) continue
      for (const r of reducedReqs.get(s.id) ?? []) {
        if (!pos.has(r.id) || isoSet.has(r.id)) continue
        const from = pos.get(r.id)!
        const cf = col.get(r.id)!
        const dcol = ct - cf
        const srcBelow = from.y > to.y
        let fam: Fam
        if (dcol > 0) {
          // vEnter (Eintritt oben/unten) nur, wenn Quelle klar ober-/unterhalb (dy>=NH, dann ist eine
          // gerade Linie ohnehin unmöglich) UND Zielspalte vertikal + Quellzeile horizontal frei.
          const dy = Math.abs(from.y - to.y)
          const yc = from.y + NH / 2
          const ctMembers = columnMembers.get(ct) ?? []
          const vertClear = !ctMembers.some(
            (m) => m.id !== s.id && m.y > Math.min(from.y, to.y) && m.y < Math.max(from.y, to.y),
          )
          const horizClear = ![...columnMembers.entries()].some(
            ([c, ms]) =>
              c > cf && c <= ct && ms.some((m) => m.id !== s.id && m.y <= yc && yc <= m.y + NH),
          )
          fam = dy >= NH && vertClear && horizClear ? 'vent' : 'fwd'
        } else if (dcol < 0) {
          fam = 'back'
        } else {
          const cardBetween = (columnMembers.get(cf) ?? []).some(
            (m) =>
              m.id !== r.id &&
              m.id !== s.id &&
              m.y > Math.min(from.y, to.y) &&
              m.y < Math.max(from.y, to.y),
          )
          fam = cardBetween ? 'gutter' : 'samecol'
        }
        const info: EInfo = {
          r: r.id,
          s: s.id,
          level: r.level,
          cf,
          ct,
          dcol,
          fx: from.x,
          fy: from.y,
          tx: to.x,
          ty: to.y,
          fam,
          srcBelow,
          entryY: 0,
          exitY: 0,
          entryX: 0,
          straight: false,
        }
        infos.push(info)
        if (fam === 'fwd') {
          // Entry an der LINKEN Kante des Ziels (Exit folgt, wenn straight bekannt ist).
          pushY(`${s.id}:L`, { key: from.y, key2: from.x, pin: null, kind: 'in', apply: (y) => (info.entryY = y) })
        } else if (fam === 'vent') {
          // Entry oben/unten am Ziel (x-Bahn), Exit an der rechten Kante der Quelle (y-Bahn).
          pushX(`${s.id}:${srcBelow ? 'B' : 'T'}`, { key: from.x, apply: (x) => (info.entryX = x) })
          pushY(`${r.id}:R`, { key: to.y, key2: to.x, pin: null, kind: 'out', apply: (y) => (info.exitY = y) })
        } else if (fam === 'samecol') {
          // Ein gemeinsamer vertikaler x-Wert (Exit Quelle == Entry Ziel) an der oberen/unteren Kante.
          const below = to.y > from.y
          pushX(`${s.id}:${below ? 'T' : 'B'}`, { key: from.x, apply: (x) => (info.entryX = x) })
        } else if (fam === 'gutter') {
          pushY(`${s.id}:R`, { key: from.y, key2: from.x, pin: null, kind: 'in', apply: (y) => (info.entryY = y) })
          pushY(`${r.id}:R`, { key: to.y, key2: to.x, pin: null, kind: 'out', apply: (y) => (info.exitY = y) })
        } else {
          // back: Exit an der linken Kante der Quelle (maßgeblich). Der Ziel-Eintritt an der rechten
          // Kante folgt in Phase 3 – gepinnt, falls die Kante gerade sein kann.
          pushY(`${r.id}:L`, { key: to.y, key2: to.x, pin: null, kind: 'out', apply: (y) => (info.exitY = y) })
        }
      }
    }

    // Ports je Kartenkante gleichmäßig verteilen (1 -> mittig, N -> äquidistant).
    // Alle Ports EINER physischen Kartenkante zusammen verteilen, damit ein- und ausgehende Pfeile
    // sich NIE dieselbe Höhe teilen. Als „Entität" zählt: jeder eingehende Port einzeln (distinkte
    // Pfeilspitzen); jeder gerade (gepinnte) Exit einzeln; alle übrigen (nicht-geraden) Exits werden
    // zu EINER Entität gebündelt und hängen sich – falls vorhanden – an den nächstgelegenen geraden
    // Exit an (gemeinsamer Austrittspunkt, gerade Linie bleibt gerade).
    const resolveY = (busKey: string, ports: YPort[]) => {
      const cy = pos.get(busKey.split(':')[0])!.y
      const lo = cy + 8
      const hi = cy + NH - 8
      const ents: { key: number; key2: number; pin: number | null; ports: YPort[] }[] = []
      for (const p of ports)
        if (p.kind === 'in' || p.pin !== null) ents.push({ key: p.key, key2: p.key2, pin: p.pin, ports: [p] })
      const free = ports.filter((p) => p.kind === 'out' && p.pin === null)
      if (free.length) {
        const avg = free.reduce((a, p) => a + p.key, 0) / free.length
        const avg2 = free.reduce((a, p) => a + p.key2, 0) / free.length
        const pinnedOut = ents.filter((e) => e.pin !== null)
        if (pinnedOut.length) {
          let best = pinnedOut[0]
          for (const e of pinnedOut) if (Math.abs(e.key - avg) < Math.abs(best.key - avg)) best = e
          best.ports.push(...free)
        } else {
          ents.push({ key: avg, key2: avg2, pin: null, ports: free })
        }
      }
      // y aufsteigend (oben zuerst); bei Gleichstand x absteigend -> weiter rechts liegende Karte oben.
      ents.sort((a, b) => a.key - b.key || b.key2 - a.key2)
      const n = ents.length
      const gap = (hi - lo) / (n + 1)
      // Startpositionen: gepinnte (gerade Linien) auf ihren Pin, übrige auf gleichmäßige Slots.
      const ys = ents.map((e, i) => (e.pin !== null ? Math.max(lo, Math.min(hi, e.pin)) : lo + gap * (i + 1)))
      // Reihenfolge (nach key) beibehalten und Mindestabstand erzwingen. Gepinnte bleiben fix; die
      // übrigen weichen ihnen aus -> ein eingehender Pfeil landet nie auf der Höhe einer geraden Linie.
      for (let i = 1; i < n; i++) {
        if (ys[i] < ys[i - 1] + gap) {
          if (ents[i].pin === null) ys[i] = ys[i - 1] + gap
          else for (let j = i - 1; j >= 0 && ys[j] > ys[j + 1] - gap; j--) if (ents[j].pin === null) ys[j] = ys[j + 1] - gap
        }
      }
      ents.forEach((e, i) => {
        const y = Math.max(lo, Math.min(hi, ys[i]))
        for (const p of e.ports) p.apply(y)
      })
    }
    const resolveX = (busKey: string, ports: XPort[]) => {
      const cx = pos.get(busKey.split(':')[0])!.x
      const n = ports.length
      ports.sort((a, b) => a.key - b.key)
      ports.forEach((p, i) => p.apply(cx + (NW * (i + 1)) / (n + 1)))
    }
    // 1. x-Bahnen (oben/unten) + 2. LINKE Kanten (`:L`) auflösen. Die linke Kante trägt fwd-Eintritte
    //    und Rückwärts-Austritte (beide ohne Pin) -> Eintrittshöhen stehen danach fest.
    for (const [key, ports] of xBus) resolveX(key, ports)
    for (const [key, ports] of yBus) if (key.endsWith(':L')) resolveY(key, ports)
    // 3. Straight bestimmen + den jeweils zweiten Port an der rechten Kante anlegen:
    //    - fwd: Ziel-Eintritt maßgeblich (linke Kante); gerade, wenn er im Quell-Band liegt & Pfad
    //      frei -> Quell-Austritt (rechte Kante) auf die Eintrittshöhe gepinnt, sonst gebündelt.
    //    - back: Quell-Austritt maßgeblich (linke Kante); gerade, wenn er im ZIEL-Band liegt & Pfad
    //      frei -> Ziel-Eintritt (rechte Kante) auf die Austrittshöhe gepinnt.
    for (const info of infos) {
      if (info.fam === 'fwd') {
        info.straight =
          info.entryY >= info.fy + 8 &&
          info.entryY <= info.fy + NH - 8 &&
          !colBlockedAtY(info.cf, info.ct, info.entryY, info.r, info.s)
        pushY(`${info.r}:R`, {
          key: info.ty,
          key2: info.tx,
          pin: info.straight ? info.entryY : null,
          kind: 'out',
          apply: (y) => (info.exitY = y),
        })
      } else if (info.fam === 'back') {
        info.straight =
          info.exitY >= info.ty + 8 &&
          info.exitY <= info.ty + NH - 8 &&
          !colBlockedAtY(info.ct, info.cf, info.exitY, info.r, info.s)
        pushY(`${info.s}:R`, {
          key: info.fy,
          key2: info.fx,
          pin: info.straight ? info.exitY : null,
          kind: 'in',
          apply: (y) => (info.entryY = y),
        })
      }
    }
    // 4. RECHTE Kanten (`:R`) auflösen: fwd/vent/gutter-Austritte + gutter/back-Eintritte gemeinsam,
    //    ein-/ausgehend getrennt, nicht-gerade Austritte gebündelt.
    for (const [key, ports] of yBus) if (key.endsWith(':R')) resolveY(key, ports)

    // --- PASS 2: Polylinien bauen ---
    for (const info of infos) {
      const { r, s, level, cf, ct, dcol, fx, fy, tx, ty, entryY, exitY, entryX, srcBelow, fam } = info
      if (fam === 'fwd' && info.straight) {
        const tip = tx - 6
        directEdges.push({
          points: [
            [fx + NW, exitY],
            [tip, exitY],
          ],
          lx: tip - 16,
          ly: exitY - 8,
          level,
          from: r,
          to: s,
        })
      } else if (fam === 'fwd') {
        // Nicht gerade -> Trunk/Band (wie bisher), Austritt auf verteilter Höhe y1 = exitY.
        const y1 = exitY
        let blockCol = Infinity
        for (const [c, ms] of columnMembers) {
          if (c > cf && c < ct && ms.some((m) => m.id !== r && m.id !== s && m.y <= y1 && y1 <= m.y + NH))
            blockCol = Math.min(blockCol, c)
        }
        const banded = blockCol !== Infinity
        const simpleTurn =
          banded &&
          ![...columnMembers.entries()].some(
            ([c, ms]) =>
              c >= blockCol &&
              c < ct &&
              ms.some((m) => m.id !== r && m.id !== s && m.y <= entryY && entryY <= m.y + NH),
          )
        // Ausweich-Seite (Band ober-/unterhalb der Zielzeile). Bei gleicher Quell-/Zielzeile (Zeile
        // durch Karte blockiert) die Seite wählen, die den ANDEREN eingehenden Kanten des Ziels
        // ausweicht (kommen sie v.a. von unten -> Band nach oben, und umgekehrt); sonst wie bisher.
        let bandTop = entryY >= y1 ? ty - RG : ty + NH
        if (fy === ty) {
          let above = 0
          let below = 0
          for (const rr of reducedReqs.get(s) ?? []) {
            const pp = rr.id !== r && pos.get(rr.id)
            if (!pp) continue
            if (pp.y < ty) above++
            else if (pp.y > ty) below++
          }
          if (below !== above) bandTop = below > above ? ty - RG : ty + NH
        }
        segs.push({
          from: r,
          to: s,
          level,
          x1: fx + NW,
          y1,
          entryY,
          toX: tx,
          banded,
          simpleTurn,
          turnX: banded ? blockCol * (NW + CG) - 24 : 0,
          bandTop,
          laneY: y1,
          xTrunk: tx - 24,
        })
      } else if (fam === 'vent') {
        const endY = srcBelow ? ty + NH : ty
        directEdges.push({
          points: [
            [fx + NW, exitY],
            [entryX, exitY],
            [entryX, endY],
          ],
          lx: entryX + 8,
          ly: srcBelow ? endY + 12 : endY - 12,
          level,
          from: r,
          to: s,
        })
      } else if (fam === 'samecol') {
        const below = ty > fy
        const startY = below ? fy + NH : fy
        const endY = below ? ty : ty + NH
        directEdges.push({
          points: [
            [entryX, startY],
            [entryX, endY],
          ],
          lx: entryX + 8,
          ly: below ? endY - 12 : endY + 12,
          level,
          from: r,
          to: s,
        })
      } else if (fam === 'back' && info.straight) {
        // Gerade Rückwärts-Linie: von der linken Kante der Quelle waagerecht in die rechte Kante des
        // Ziels (Austritt == Eintritt == exitY).
        const tip = tx + NW
        directEdges.push({
          points: [
            [fx, exitY],
            [tip, exitY],
          ],
          lx: tip + 16,
          ly: exitY - 8,
          level,
          from: r,
          to: s,
        })
      } else {
        // gutter (dcol===0, Karte im Weg) und back (dcol<0): Seiten-Gutter mit Vertikale durch eine
        // Spalten-Lücke -> in (C) mit-verteilen. Unterschied nur im Austrittspunkt/der Gutter-Seite.
        const tip = tx + NW
        const xg = fam === 'gutter' ? fx + NW + 20 : dcol === -1 ? tip + 12 : fx - 12
        const startX = fam === 'gutter' ? fx + NW : fx
        const p1: [number, number] = [xg, exitY]
        const p2: [number, number] = [xg, entryY]
        directEdges.push({
          points: [[startX, exitY], p1, p2, [tip, entryY]],
          lx: tip + 16,
          ly: entryY - 8,
          level,
          from: r,
          to: s,
        })
        directVsegs.push({
          gapCol: gapColOf(xg),
          lo: Math.min(exitY, entryY),
          hi: Math.max(exitY, entryY),
          from: r,
          dir: -1, // rückwärts/gutter -> liefert nach links
          set: (x) => {
            p1[0] = x
            p2[0] = x
          },
        })
      }
    }
    // (B) Horizontale Lanes: mehrspaltige Kanten je Zeilen-Lücke gruppieren; jeder Quell-Skill
    // erhält eine eigene Höhe (nach Quellposition gestapelt). Gleiche Quelle teilt sich eine Lane.
    const byBand = new Map<number, Seg[]>()
    for (const e of segs) {
      if (!e.banded || e.simpleTurn) continue
      const arr = byBand.get(e.bandTop) ?? []
      arr.push(e)
      byBand.set(e.bandTop, arr)
    }
    for (const group of byBand.values()) {
      const sources = [...new Set(group.map((e) => e.from))].sort(
        (a, b) => pos.get(a)!.y - pos.get(b)!.y || a.localeCompare(b),
      )
      const laneOf = new Map(sources.map((id, idx) => [id, idx]))
      const n = sources.length
      for (const e of group) {
        e.laneY = e.bandTop + (RG * (laneOf.get(e.from)! + 1)) / (n + 1)
      }
    }
    // (C) Vertikale Lanes je Spalten-Zwischenraum kollisionsfrei verteilen. Berücksichtigt werden
    // ALLE Verticals in einem Zwischenraum: die Ziel-Trunks (am Ziel) UND die Abbiege-Verticals
    // (turnX) durchlaufender Band-Kanten. So teilt sich z.B. ein durchlaufender Pfeil seine
    // Abbiege-Bahn nicht mit dem Trunk einer dort endenden Kante. Bündelung nach Quelle bleibt.
    // Auch die Sonderfall-Verticals (rückwärts/Gutter) laufen hier mit ein.
    const vsegs: VSeg[] = [...directVsegs]
    for (const e of segs) {
      if (e.banded && e.simpleTurn) {
        // Ein einziger vertikaler Abschnitt an der Blockspalte (y1 -> entryY).
        vsegs.push({
          gapCol: gapColOf(e.turnX + 24),
          lo: Math.min(e.y1, e.entryY),
          hi: Math.max(e.y1, e.entryY),
          from: e.from,
          dir: 1,
          set: (x) => (e.turnX = x),
        })
      } else if (e.banded) {
        // Voll-Band: Trunk am Ziel (laneY -> entryY) + Abbieg-Vertical an der Blockspalte.
        vsegs.push({
          gapCol: gapColOf(e.toX),
          lo: Math.min(e.laneY, e.entryY),
          hi: Math.max(e.laneY, e.entryY),
          from: e.from,
          dir: 1,
          set: (x) => (e.xTrunk = x),
        })
        vsegs.push({
          gapCol: gapColOf(e.turnX + 24),
          lo: Math.min(e.y1, e.laneY),
          hi: Math.max(e.y1, e.laneY),
          from: e.from,
          dir: 1,
          set: (x) => (e.turnX = x),
        })
      } else {
        // Einspaltig/gerade Zeile: Trunk am Ziel (y1 -> entryY).
        vsegs.push({
          gapCol: gapColOf(e.toX),
          lo: Math.min(e.y1, e.entryY),
          hi: Math.max(e.y1, e.entryY),
          from: e.from,
          dir: 1,
          set: (x) => (e.xTrunk = x),
        })
      }
    }
    const byGap = new Map<number, VSeg[]>()
    for (const v of vsegs) {
      const arr = byGap.get(v.gapCol) ?? []
      arr.push(v)
      byGap.set(v.gapCol, arr)
    }
    for (const [gapCol, group] of byGap) {
      // Verticals gleicher QUELLE bündeln (teilen sich eine Bahn); verschiedene Quellen per
      // Intervallfärbung nach vertikaler Ausdehnung trennen.
      // Nach (Richtung, QUELLE) bündeln: gleiche Quelle+Richtung teilt sich eine Bahn.
      const bySrc = new Map<string, VSeg[]>()
      for (const v of group) {
        const key = `${v.dir}:${v.from}`
        const arr = bySrc.get(key) ?? []
        arr.push(v)
        bySrc.set(key, arr)
      }
      const srcGroups = [...bySrc.values()].map((vs) => {
        let lo = Infinity
        let hi = -Infinity
        for (const v of vs) {
          lo = Math.min(lo, v.lo)
          hi = Math.max(hi, v.hi)
        }
        return { vs, lo, hi, dir: vs[0].dir, idx: 0 }
      })
      // Intervallfärbung getrennt je Richtung; rechts-liefernde (dir +1) belegen die rechten Lanes
      // (kleine idx), links-liefernde (dir -1) die linken (idx danach). So kreuzen sich Ein-/Ausgang
      // an einem Knoten nicht mehr.
      const color = (gs: typeof srcGroups, start: number) => {
        const ends: number[] = []
        for (const g of gs.sort((a, b) => a.lo - b.lo)) {
          let i = ends.findIndex((end) => end <= g.lo - 4)
          if (i === -1) {
            i = ends.length
            ends.push(g.hi)
          } else {
            ends[i] = g.hi
          }
          g.idx = start + i
        }
        return ends.length
      }
      const kR = color(
        srcGroups.filter((g) => g.dir === 1),
        0,
      )
      const nLanes = kR + color(
        srcGroups.filter((g) => g.dir === -1),
        kR,
      )
      const laneStep = CG / (nLanes + 1)
      const gapX = gapCol * (NW + CG)
      for (const g of srcGroups) for (const v of g.vs) v.set(gapX - laneStep * (g.idx + 1))
    }
    // (D) Polylinien der Regelfall-Kanten.
    const rightEdges: Edge[] = segs.map((e) => {
      const x2 = e.toX - 6
      const turn = e.banded && e.simpleTurn ? e.turnX : e.xTrunk
      const points: Array<[number, number]> =
        e.banded && !e.simpleTurn
          ? [
              // Voll-Band: auf Quellzeile bis zum Abbiegepunkt (geteilt), runter/hoch in die
              // Zeilen-Lücke (geteilte vertikale Bahn), Band-Horizontale und Trunk ins Ziel.
              [e.x1, e.y1],
              [e.turnX, e.y1],
              [e.turnX, e.laneY],
              [e.xTrunk, e.laneY],
              [e.xTrunk, e.entryY],
              [x2, e.entryY],
            ]
          : [
              // 2 Ecken: auf Quellzeile bis zur (Block- bzw. Ziel-)Bahn, hoch/runter auf Zielhöhe,
              // gerade ins Ziel.
              [e.x1, e.y1],
              [turn, e.y1],
              [turn, e.entryY],
              [x2, e.entryY],
            ]
      return {
        points,
        lx: x2 - 16,
        ly: e.entryY - 8,
        level: e.level,
        from: e.from,
        to: e.to,
      }
    })
    const edges: Edge[] = [...rightEdges, ...directEdges]
    return { pos, width, height, edges }
  }, [available, availById, classId, reducedReqs])

  if (!classId) {
    return <p className="empty small">Erst eine Klasse wählen.</p>
  }
  if (available.length === 0) {
    return (
      <p className="empty small">
        Für diese Klasse sind noch keine Skill-Daten hinterlegt.
      </p>
    )
  }

  function raise(skill: SkillDef, level: number) {
    // Auto-Lernen: benötigte Vor-Skills werden mit hochgezogen.
    onChange(learnSkill(levels, skill.id, level, available))
  }

  function lower(skill: SkillDef, level: number) {
    // Reduzieren erlaubt; Folge-Skills, deren Voraussetzung dadurch bricht, werden
    // automatisch mit-verlernt (Kaskade).
    onChange(lowerSkill(levels, skill.id, level, available))
  }

  function SkillRow({ skill }: { skill: SkillDef }) {
    const level = levels[skill.id] ?? 0
    const canInc = level < skill.maxLevel
    const canDec = level > 0
    return (
      <div className={`skill-row2${level > 0 ? ' active' : ''}`}>
        <span className="skill-nm">
          {displayName(skill.id, skill.name)}
          {skill.platinum && (
            <span className="skill-quest" title="Platin-/Quest-Skill – kostet keinen Skillpunkt">
              Quest
            </span>
          )}
        </span>
        <div className="skill-stepper">
          <button
            type="button"
            disabled={!canDec}
            title="Strg+Klick: ganz verlernen (inkl. abhängiger Skills)"
            onClick={(e) =>
              lower(skill, e.ctrlKey || e.metaKey ? 0 : level - 1)
            }
            aria-label={`${skill.name} verringern`}
          >
            −
          </button>
          <span className="skill-lvl">
            {level}/{skill.maxLevel}
          </span>
          <button
            type="button"
            disabled={!canInc}
            title="Strg+Klick: auf Maximum"
            onClick={(e) =>
              raise(skill, e.ctrlKey || e.metaKey ? skill.maxLevel : level + 1)
            }
            aria-label={`${skill.name} erhöhen`}
          >
            +
          </button>
        </div>
      </div>
    )
  }

  // Ingame-Ansicht: kompakte Icon-Zelle. Klick = +1 (Strg = Max), Rechtsklick = −1 (Strg = Min).
  function SkillCell({ skill }: { skill: SkillDef }) {
    const level = levels[skill.id] ?? 0
    const canInc = level < skill.maxLevel
    const canDec = level > 0
    const url = iconUrl(skill.id)
    const relation = relationOf(skill)
    const relClass = relation
      ? ` rel-${relation.rel}${relation.indirect ? ' rel-indirect' : ''}`
      : ''
    return (
      <div
        className={`skill-cell${level > 0 ? ' active' : ''}${relClass}`}
        data-skill-id={skill.id}
        onMouseEnter={() => setHovered(skill.id)}
        onMouseLeave={() => setHovered((h) => (h === skill.id ? null : h))}
        title={`${displayName(skill.id, skill.name)} — ${level}/${skill.maxLevel}\nKlick: +  ·  Rechtsklick: −  ·  Strg: Max/Ganz verlernen`}
        onClick={(e) =>
          canInc && raise(skill, e.ctrlKey || e.metaKey ? skill.maxLevel : level + 1)
        }
        onContextMenu={(e) => {
          e.preventDefault()
          if (canDec) lower(skill, e.ctrlKey || e.metaKey ? 0 : level - 1)
        }}
      >
        <span className="cell-name">{skill.name}</span>
        {url ? (
          <img src={url} alt="" loading="lazy" />
        ) : (
          <span className="cell-noicon">{skill.name.slice(0, 3)}</span>
        )}
        <span className="cell-lvl">
          {level}/{skill.maxLevel}
        </span>
        {skill.platinum && (
          <span className="cell-q" title="Platin-/Quest-Skill">
            Q
          </span>
        )}
        {relation && relation.rel !== 'source' && !relation.indirect && (
          <span
            className={`rel-badge rel-${relation.rel}`}
            title={
              relation.rel === 'req'
                ? `Voraussetzung: Level ${relation.level}`
                : `Benötigt diesen Skill auf Level ${relation.level}`
            }
          >
            {relation.level}
          </span>
        )}
      </div>
    )
  }

  // Ingame-Raster (7 Spalten, Positionen aus skilltreeview.lub). Position je Skill über
  // die liefernde Klasse – so lassen sich mehrere Klassen-Raster verlustfrei überlagern.
  const posOf = (s: SkillDef): number | undefined => SKILL_GRID[s.classId]?.[s.id]
  function gridForSkills(skills: SkillDef[]) {
    const placed = skills.filter((s) => posOf(s) !== undefined)
    const extras = skills.filter((s) => posOf(s) === undefined)
    const maxIdx = placed.reduce((m, s) => Math.max(m, posOf(s)!), -1)
    const cells: (SkillDef | null)[] = Array(
      maxIdx >= 0 ? (Math.floor(maxIdx / GRID_COLS) + 1) * GRID_COLS : 0,
    ).fill(null)
    for (const s of placed) cells[posOf(s)!] = s
    const cols = { gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }
    return (
      <>
        {maxIdx >= 0 && (
          <div className="skill-grid" style={cols}>
            {cells.map((s, i) =>
              s ? (
                <SkillCell key={s.id} skill={s} />
              ) : (
                <div key={`e${i}`} className="skill-cell empty" />
              ),
            )}
          </div>
        )}
        {extras.length > 0 && (
          <div className="skill-grid" style={cols}>
            {extras.map((s) => (
              <SkillCell key={s.id} skill={s} />
            ))}
          </div>
        )}
      </>
    )
  }

  // Baum-Ansicht: breiterer Knoten mit Icon, Name und Level-Punkten (wie im RO-Client-Skilltree).
  function TreeNode({ skill, style }: { skill: SkillDef; style?: CSSProperties }) {
    const level = levels[skill.id] ?? 0
    const canInc = level < skill.maxLevel
    const canDec = level > 0
    const url = iconUrl(skill.id)
    const relation = relationOf(skill)
    const relClass = relation
      ? ` rel-${relation.rel}${relation.indirect ? ' rel-indirect' : ''}`
      : ''
    return (
      <div
        style={style}
        className={`tree-node2${level > 0 ? ' active' : ''}${relClass}`}
        data-skill-id={skill.id}
        onMouseEnter={() => setHovered(skill.id)}
        onMouseLeave={() => setHovered((h) => (h === skill.id ? null : h))}
        title={`${displayName(skill.id, skill.name)} — ${level}/${skill.maxLevel}\nKlick: +  ·  Rechtsklick: −  ·  Strg: Max/Ganz verlernen`}
        onClick={(e) =>
          canInc && raise(skill, e.ctrlKey || e.metaKey ? skill.maxLevel : level + 1)
        }
        onContextMenu={(e) => {
          e.preventDefault()
          if (canDec) lower(skill, e.ctrlKey || e.metaKey ? 0 : level - 1)
        }}
      >
        <div className="tn-head">
          {url ? (
            <img src={url} alt="" loading="lazy" />
          ) : (
            <span className="cell-noicon">{skill.name.slice(0, 3)}</span>
          )}
          <span className="tn-name">{skill.name}</span>
          {skill.platinum && (
            <span className="tn-q" title="Platin-/Quest-Skill">
              Q
            </span>
          )}
        </div>
        <div className="tn-foot">
          <span className="tn-pips">
            {Array.from({ length: skill.maxLevel }, (_, i) => (
              <span key={i} className={`tn-pip${i < level ? ' on' : ''}`} />
            ))}
          </span>
          <span className="tn-lvl">
            {level}/{skill.maxLevel}
          </span>
        </div>
      </div>
    )
  }

  // Skills nach Klasse (Tier) gruppieren – Reihenfolge wie in der Vererbungskette.
  const byClass = new Map<string, SkillDef[]>()
  for (const s of available) {
    const arr = byClass.get(s.classId) ?? []
    arr.push(s)
    byClass.set(s.classId, arr)
  }

  // Ingame-Ansicht: Klassen-Raster zu 2 Töpfen zusammenfassen —
  // A: Novice + First (bzw. Basis-Expanded), B: Second + Rebirth (bzw. fortgeschr. Expanded).
  const bucketOf = (cid: string): 'A' | 'B' => {
    const t = getClass(cid)?.tier
    if (t === 'second' || t === 'transcendent') return 'B'
    if (t === 'expanded') return cid === 'stargladiator' || cid === 'soullinker' ? 'B' : 'A'
    return 'A'
  }
  const chainIds = classChain(classId).map((c) => c.id)
  // Reihenfolge im Ingame-Raster: zuerst Topf B (2nd/Rebirth), dann A (Novice/1st).
  const gridBuckets = (['B', 'A'] as const)
    .map((key) => {
      const ids = chainIds.filter((id) => byClass.has(id) && bucketOf(id) === key)
      return {
        key,
        header: ids.map((id) => getClass(id)?.name ?? id).join(' / '),
        skills: ids.flatMap((id) => byClass.get(id)!),
      }
    })
    .filter((b) => b.skills.length > 0)

  // Nur Töpfe zeigen, für die die Klasse tatsächlich punktekostende Skills hat
  // (Platin-Skills verbrauchen keine Punkte und zählen nicht für die Topf-Anzeige).
  const poolsPresent = new Set(
    available.filter((s) => !s.platinum).map((s) => skillPool(s)),
  )
  const labels = poolLabels(classId)
  const pools: { key: string; label: string; info: PoolInfo }[] = [
    { key: 'novice', label: labels.novice, info: points.novice },
    { key: 'first', label: labels.first, info: points.first },
    { key: 'second', label: labels.second, info: points.second },
  ]

  return (
    <div className="skilltree">
      <div className="skill-head">
        <div className="skill-budgets">
          {pools
            .filter((p) => poolsPresent.has(p.key as 'novice' | 'first' | 'second'))
            .map((p) => (
              <span
                key={p.key}
                className={p.info.spent > p.info.cap ? 'over-text' : ''}
              >
                {p.label}: {p.info.spent}/{p.info.cap}
              </span>
            ))}
        </div>
        <div className="view-toggle">
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            onClick={() => changeView('list')}
          >
            Liste
          </button>
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            onClick={() => changeView('grid')}
            title="Wie im Spiel: Icon-Raster (Positionen aus dem RO-Client)"
          >
            Ingame
          </button>
          <button
            type="button"
            className={view === 'tree' ? 'active' : ''}
            onClick={() => changeView('tree')}
            title="Skilltree-Diagramm mit Verbindungslinien (benötigtes Level an der Linie)"
          >
            Baum
          </button>
        </div>
      </div>

      {view === 'tree' ? (
        <div className="skill-tree-scroll">
          <div
            className="skill-tree-canvas"
            style={{ width: treeLayout.width, height: treeLayout.height }}
          >
            <svg
              className="tree-edges"
              width={treeLayout.width}
              height={treeLayout.height}
              aria-hidden
            >
              <defs>
                <marker
                  id="te-head"
                  markerUnits="userSpaceOnUse"
                  markerWidth="11"
                  markerHeight="11"
                  refX="9"
                  refY="5"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 Z" className="te-ah" />
                </marker>
              </defs>
              {/* Zuerst alle Linien (Casing in BG-Farbe + Linie darüber). Da spätere Linien-
                  Casings frühere Linien an Kreuzungen überdecken, entsteht der „Brücken"-Effekt
                  (kleine Unterbrechung → eine Linie wirkt über der anderen). Mit dem gehoverten
                  Skill verbundene Kanten werden hervorgehoben und zuletzt gezeichnet (liegen oben). */}
              {[...treeLayout.edges.entries()]
                .sort(([, a], [, b]) => edgeRel(a) - edgeRel(b))
                .map(([i, e]) => {
                  const pts = e.points.map((p) => p.join(',')).join(' ')
                  const r = edgeRel(e)
                  return (
                    <g key={i}>
                      <polyline points={pts} className="tree-edge-casing" />
                      <polyline
                        points={pts}
                        className={`tree-edge${r === 2 ? ' hl' : r === 1 ? ' hl-indirect' : ''}`}
                        markerEnd="url(#te-head)"
                      />
                    </g>
                  )
                })}
              {/* Level-Zahlen zuletzt, damit sie nie von einem Casing verdeckt werden. */}
              {treeLayout.edges.map((e, i) => {
                const r = edgeRel(e)
                return (
                  <text
                    key={i}
                    x={e.lx}
                    y={e.ly}
                    className={`tree-edge-lvl${r === 2 ? ' hl' : r === 1 ? ' hl-indirect' : ''}`}
                  >
                    {e.level}
                  </text>
                )
              })}
            </svg>
            {available.map((s) => {
              const p = treeLayout.pos.get(s.id)
              if (!p) return null
              return (
                <TreeNode
                  key={s.id}
                  skill={s}
                  style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    width: NW,
                    height: NH,
                  }}
                />
              )
            })}
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className={`skill-grid-wrap${hovered ? ' has-hover' : ''}`}>
          {gridBuckets.map((b) => (
            <div key={b.key} className="skill-group">
              <h5>{b.header}</h5>
              {gridForSkills(b.skills)}
            </div>
          ))}
        </div>
      ) : (
        [...byClass.entries()].map(([cid, skills]) => (
          <div key={cid} className="skill-group">
            <h5>{getClass(cid)?.name ?? cid}</h5>
            {[...skills]
              .sort(
                (a, b) =>
                  Number(!!a.platinum) - Number(!!b.platinum) ||
                  a.name.localeCompare(b.name),
              )
              .map((s) => <SkillRow key={s.id} skill={s} />)}
        </div>
        ))
      )}
    </div>
  )
}
