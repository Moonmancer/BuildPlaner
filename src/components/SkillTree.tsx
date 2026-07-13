import { useMemo, useState } from 'react'
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
  dependentsBlocking,
  skillPoints,
  skillPool,
  poolLabels,
  learnSkill,
  type SkillDef,
  type PoolInfo,
} from '../ro/skills'
import { SKILL_GRID, GRID_COLS } from '../skillGrid'
import { RO_ID_TO_SKILL } from '../roSkillIds'

// Unsere Skill-Konstante -> numerische RO-ID (für die Ingame-Icons von db.irowiki.org).
const SKILL_TO_RO_ID: Record<string, number> = {}
for (const [num, id] of Object.entries(RO_ID_TO_SKILL)) SKILL_TO_RO_ID[id] = Number(num)

// Server-spezifische Platin-Skills (Arcadia) ohne RO-ID: eigene, lokal abgelegte Icons
// (public/skill-icons/<ID>.png, gezogen aus wiki.arcadia-online.org/Platinum_Skills).
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
const iconUrl = (id: string) => {
  if (CUSTOM_ICON_IDS.has(id)) {
    return `${import.meta.env.BASE_URL}skill-icons/${id}.png`
  }
  return SKILL_TO_RO_ID[id]
    ? `https://db.irowiki.org/image/skill/${SKILL_TO_RO_ID[id]}.png`
    : null
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
  const [view, setView] = useState<'list' | 'grid'>('list')
  const available = useMemo(() => skillsForClass(classId), [classId])
  const points = skillPoints(classId, levels, earlyJobChangeLevel)

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
    const clamped = Math.max(0, level)
    const next = { ...levels }
    if (clamped <= 0) delete next[skill.id]
    else next[skill.id] = clamped
    onChange(next)
  }

  function SkillRow({ skill }: { skill: SkillDef }) {
    const level = levels[skill.id] ?? 0
    // Herunterstufen blockieren, wenn ein aktiver Folge-Skill dieses Level braucht.
    const blockers = dependentsBlocking(skill, level - 1, levels, available)
    const canInc = level < skill.maxLevel
    const canDec = level > 0 && blockers.length === 0
    // Minimum, ohne aktive Folge-Skills zu brechen (für Strg+Klick auf „−").
    const minAllowed = available.reduce((m, s2) => {
      if ((levels[s2.id] ?? 0) <= 0) return m
      const req = s2.requires.find((r) => r.id === skill.id)
      return req ? Math.max(m, req.level) : m
    }, 0)
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
            title="Strg+Klick: auf Minimum"
            onClick={(e) =>
              lower(skill, e.ctrlKey || e.metaKey ? minAllowed : level - 1)
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
    const minAllowed = available.reduce((m, s2) => {
      if ((levels[s2.id] ?? 0) <= 0) return m
      const req = s2.requires.find((r) => r.id === skill.id)
      return req ? Math.max(m, req.level) : m
    }, 0)
    const canDec =
      level > 0 &&
      dependentsBlocking(skill, level - 1, levels, available).length === 0
    const url = iconUrl(skill.id)
    return (
      <div
        className={`skill-cell${level > 0 ? ' active' : ''}`}
        title={`${displayName(skill.id, skill.name)} — ${level}/${skill.maxLevel}\nKlick: +  ·  Rechtsklick: −  ·  Strg: Max/Min`}
        onClick={(e) =>
          canInc && raise(skill, e.ctrlKey || e.metaKey ? skill.maxLevel : level + 1)
        }
        onContextMenu={(e) => {
          e.preventDefault()
          if (canDec) lower(skill, e.ctrlKey || e.metaKey ? minAllowed : level - 1)
        }}
      >
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
            onClick={() => setView('list')}
          >
            Liste
          </button>
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
            title="Wie im Spiel: Icon-Raster (Positionen aus dem RO-Client)"
          >
            Ingame
          </button>
        </div>
      </div>

      {view === 'grid'
        ? gridBuckets.map((b) => (
            <div key={b.key} className="skill-group">
              <h5>{b.header}</h5>
              {gridForSkills(b.skills)}
            </div>
          ))
        : [...byClass.entries()].map(([cid, skills]) => (
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
      ))}
    </div>
  )
}
