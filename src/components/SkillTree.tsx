import { useMemo, useState } from 'react'
import type { SkillLevels } from '../types'
import { getClass } from '../ro/classes'
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

interface Props {
  classId: string | null
  levels: SkillLevels
  earlyJobChangeLevel: number
  onChange: (levels: SkillLevels) => void
}

/** Skill-Baum eines Builds: umschaltbar zwischen Listen- und Baum-Ansicht.
 *  Beim Erhöhen werden benötigte Vor-Skills automatisch mitgelernt.
 *  Skillpunkt-Budget je Tier (Novice / First / Second), 1 Job-Level je Punkt. */
export function SkillTree({
  classId,
  levels,
  earlyJobChangeLevel,
  onChange,
}: Props) {
  const [view, setView] = useState<'list' | 'tree'>('list')
  const available = useMemo(() => skillsForClass(classId), [classId])
  const availById = useMemo(
    () => new Map(available.map((s) => [s.id, s])),
    [available],
  )
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

  // Tiefe eines Skills anhand seiner Voraussetzungen (für die Baum-Einrückung).
  const depthOf = (() => {
    const cache = new Map<string, number>()
    function d(id: string): number {
      if (cache.has(id)) return cache.get(id)!
      cache.set(id, 0) // Zyklusschutz
      const s = availById.get(id)
      const req = s?.requires.filter((r) => availById.has(r.id)) ?? []
      const val = req.length === 0 ? 0 : 1 + Math.max(...req.map((r) => d(r.id)))
      cache.set(id, val)
      return val
    }
    return d
  })()

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
          {skill.name}
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

  // Skills nach Klasse (Tier) gruppieren – Reihenfolge wie in der Vererbungskette.
  const byClass = new Map<string, SkillDef[]>()
  for (const s of available) {
    const arr = byClass.get(s.classId) ?? []
    arr.push(s)
    byClass.set(s.classId, arr)
  }

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
            className={view === 'tree' ? 'active' : ''}
            onClick={() => setView('tree')}
          >
            Baum
          </button>
        </div>
      </div>

      {[...byClass.entries()].map(([cid, skills]) => (
        <div key={cid} className="skill-group">
          <h5>{getClass(cid)?.name ?? cid}</h5>
          {view === 'list'
            ? [...skills]
                .sort(
                  (a, b) =>
                    Number(!!a.platinum) - Number(!!b.platinum) ||
                    a.name.localeCompare(b.name),
                )
                .map((s) => <SkillRow key={s.id} skill={s} />)
            : [...skills]
                .sort((a, b) => depthOf(a.id) - depthOf(b.id))
                .map((s) => (
                  <div
                    key={s.id}
                    className="tree-node"
                    style={{ marginLeft: depthOf(s.id) * 18 }}
                  >
                    {depthOf(s.id) > 0 && <span className="tree-branch">└ </span>}
                    <SkillRow skill={s} />
                  </div>
                ))}
        </div>
      ))}
    </div>
  )
}
