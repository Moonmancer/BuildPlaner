// Reines Baum-Layout (ohne UI): ordnet die Skills einer Klasse in Ebenen (Spalten nach
// Abhängigkeitstiefe) und bestimmt die Reihenfolge innerhalb jeder Ebene so, dass möglichst
// wenige Verbindungslinien einander kreuzen. Bewertet werden ECHTE Kreuzungen (Segment-
// Schnitte), Kantenlänge nur als Feinschliff.
//
// Wird sowohl vom UI (SkillTree) als auch vom Generator (scripts/genTreeOrder) genutzt.
// Bei fixierter Reihenfolge (fixedOrder, aus src/treeOrder.ts) entfällt die Optimierung –
// die gespeicherte, verifizierte Anordnung wird direkt übernommen.

import { classChain } from './classes'
import type { SkillDef } from './skills'

/** Universelle Job-Wechsel-Voraussetzung – im Baum weder als Knoten-Kante noch Kreuzung gewertet. */
export const TREE_ARROW_EXCLUDE = 'NV_BASIC'

export interface TreeGraph {
  /** Geordnete Skill-IDs je Ebene (Spalte). Ebene = längster Abhängigkeitspfad. */
  layers: string[][]
  /** Skills ohne gezeichnete Verbindung (weder Voraussetzung noch Abhängige) – eigener Bereich. */
  isolated: string[]
  /** Ebene je Skill-ID. */
  layerOf: Record<string, number>
}

/**
 * Baut das Ebenen-Layout für eine Klasse.
 * @param available  Skills der Klasse (aus skillsForClass).
 * @param classId    Für Klassen-Gruppierung/Seed.
 * @param fixedOrder Optional: flache, vorab optimierte Reihenfolge (Master-Superset erlaubt) –
 *                   dann nur einsortieren statt neu optimieren.
 */
export function buildTreeGraph(
  available: SkillDef[],
  classId: string | null,
  fixedOrder?: readonly string[],
): TreeGraph {
  const availById = new Map(available.map((s) => [s.id, s]))
  const prereqs = (s: SkillDef) =>
    s.requires
      .filter((r) => r.id !== TREE_ARROW_EXCLUDE && availById.has(r.id))
      .map((r) => r.id)

  // Längster-Pfad-Tiefe (mit Zyklusschutz).
  const layerCache = new Map<string, number>()
  const inProgress = new Set<string>()
  const layerOf = (id: string): number => {
    if (layerCache.has(id)) return layerCache.get(id)!
    if (inProgress.has(id)) return 0
    inProgress.add(id)
    const s = availById.get(id)
    const ps = s ? prereqs(s) : []
    const l = ps.length ? 1 + Math.max(...ps.map(layerOf)) : 0
    inProgress.delete(id)
    layerCache.set(id, l)
    return l
  }

  // Abhängige (Rückkanten) – für Nachbarschaft & Isolations-Erkennung.
  const deps = new Map<string, string[]>()
  for (const s of available) {
    for (const rid of prereqs(s)) {
      if (!deps.has(rid)) deps.set(rid, [])
      deps.get(rid)!.push(s.id)
    }
  }
  const hasEdge = (id: string) => {
    const s = availById.get(id)
    return (s ? prereqs(s).length : 0) > 0 || (deps.get(id)?.length ?? 0) > 0
  }

  // Isolierte Skills (keine Kante) in eigenen Bereich; der Graph wird kompakter.
  const isolated = available.filter((s) => !hasEdge(s.id))
  const main = available.filter((s) => hasEdge(s.id))

  const chainIdx = new Map(classChain(classId).map((c, i) => [c.id, i]))
  const cx = (s: SkillDef) => chainIdx.get(s.classId) ?? 99

  const layers: SkillDef[][] = []
  for (const s of main) {
    const l = layerOf(s.id)
    ;(layers[l] ??= []).push(s)
  }
  for (let i = 0; i < layers.length; i++) layers[i] ??= []

  const finish = (): TreeGraph => ({
    layers: layers.map((arr) => arr.map((s) => s.id)),
    isolated: isolated.map((s) => s.id),
    layerOf: Object.fromEntries(
      [...main, ...isolated].map((s) => [s.id, s.id ? layerCache.get(s.id) ?? 0 : 0]),
    ),
  })

  // --- Fixierte Reihenfolge: nur einsortieren (Master-Superset -> Teilmenge behält Reihenfolge).
  if (fixedOrder) {
    const rank = new Map(fixedOrder.map((id, i) => [id, i]))
    const r = (s: SkillDef) => rank.get(s.id) ?? 1e9
    layers.forEach((arr) => arr.sort((a, b) => r(a) - r(b) || a.name.localeCompare(b.name)))
    isolated.sort((a, b) => r(a) - r(b) || a.name.localeCompare(b.name))
    return finish()
  }

  // --- Sonst: Kreuzungen minimieren.
  const neighborsOf = (s: SkillDef) => [...prereqs(s), ...(deps.get(s.id) ?? [])]

  // Deterministischer Zufall (pro Klasse stabil) für die Restart-Varianten.
  let seed = 2166136261
  for (const ch of classId ?? 'x') seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) | 0
  const rng = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const shuffle = (arr: SkillDef[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  const orderIndex = new Map<string, number>()
  const reindex = () =>
    layers.forEach((arr) => arr.forEach((s, i) => orderIndex.set(s.id, i)))
  const nrow = (id: string) => {
    const l = layerCache.get(id) ?? 0
    const len = layers[l]?.length ?? 1
    return (orderIndex.get(id) ?? 0) / Math.max(1, len - 1)
  }

  // Baryzentrum-Sortierung, abwechselnd vor-/rückwärts (zieht Nachbarn auf gleiche Höhe).
  const sweep = () => {
    for (let iter = 0; iter < 8; iter++) {
      const order = iter % 2 === 0 ? layers : [...layers].reverse()
      for (const arr of order) {
        const key = new Map<string, number>()
        arr.forEach((s, i) => {
          const vals = neighborsOf(s).map(nrow)
          key.set(
            s.id,
            vals.length
              ? vals.reduce((x, y) => x + y, 0) / vals.length
              : i / Math.max(1, arr.length - 1),
          )
        })
        arr.sort((a, b) => key.get(a.id)! - key.get(b.id)! || cx(a) - cx(b))
        reindex()
      }
    }
  }

  // Alle Kanten als Strecken (Ebene, normierte Zeile) – für echte Schnitt-Erkennung.
  const edgeSegs = () => {
    const es: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (const t of main) {
      const x2 = layerCache.get(t.id) ?? 0
      const y2 = nrow(t.id)
      for (const rid of prereqs(t)) {
        es.push({ x1: layerCache.get(rid) ?? 0, y1: nrow(rid), x2, y2 })
      }
    }
    return es
  }
  const ccw = (ax: number, ay: number, bx: number, by: number, cx2: number, cy: number) =>
    (by - ay) * (cx2 - ax) - (bx - ax) * (cy - ay)
  const cross = (
    a: { x1: number; y1: number; x2: number; y2: number },
    b: { x1: number; y1: number; x2: number; y2: number },
  ) => {
    const d1 = ccw(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)
    const d2 = ccw(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
    const d3 = ccw(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1)
    const d4 = ccw(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)
    return (
      ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    )
  }
  // Score: echte Kreuzungen (dominant) + Summe der Kantenlängen (Feinschliff für flache Linien).
  const score = () => {
    const es = edgeSegs()
    let crossings = 0
    for (let i = 0; i < es.length; i++)
      for (let j = i + 1; j < es.length; j++) if (cross(es[i], es[j])) crossings++
    let span = 0
    for (const e of es) span += Math.abs(e.y1 - e.y2)
    return crossings * 10000 + span
  }

  // Mehrere Startanordnungen; die mit den wenigsten Kreuzungen behalten.
  let best: string[][] | null = null
  let bestScore = Infinity
  for (let restart = 0; restart < 60; restart++) {
    if (restart === 0) {
      layers.forEach((arr) =>
        arr.sort((a, b) => cx(a) - cx(b) || a.name.localeCompare(b.name)),
      )
    } else {
      layers.forEach((arr) => shuffle(arr))
    }
    reindex()
    sweep()
    const sc = score()
    if (sc < bestScore - 1e-9) {
      bestScore = sc
      best = layers.map((arr) => arr.map((s) => s.id))
    }
  }
  if (best) {
    best.forEach((ids, l) => {
      layers[l] = ids.map((id) => availById.get(id)!)
    })
  }
  // Isolierte deterministisch (Klasse, dann Name).
  isolated.sort((a, b) => cx(a) - cx(b) || a.name.localeCompare(b.name))
  return finish()
}
