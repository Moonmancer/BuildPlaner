import { STATS, type Stats, type StatKey } from '../types'
import {
  MIN_STAT,
  MAX_STAT,
  statBudget,
  statRaiseCost,
  minLevelForSpent,
  hexagonViolations,
} from '../ro/stats'

interface Props {
  stats: Stats
  baseLevel: number
  isRebirth: boolean
  onChange: (stats: Stats) => void
  onSetBaseLevel: (level: number) => void
}

/** Editor für die sechs Grundattribute inkl. Pre-Renewal-Statuspunkt-Budget. */
export function StatsEditor({
  stats,
  baseLevel,
  isRebirth,
  onChange,
  onSetBaseLevel,
}: Props) {
  const budget = statBudget(stats, baseLevel, isRebirth)
  // Hexagon-Regel gilt nur für Nicht-Rebirth-Klassen.
  const hexIssues = isRebirth ? [] : hexagonViolations(stats)

  function setStat(key: StatKey, value: number) {
    const v = Number.isFinite(value)
      ? Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)))
      : MIN_STAT
    onChange({ ...stats, [key]: v })
  }

  return (
    <div className="stats">
      <div className="stats-grid">
        {STATS.map((key) => {
          const value = stats[key]
          const nextCost = value < MAX_STAT ? statRaiseCost(value) : null
          return (
            <label key={key} className="stat">
              <span className="stat-key">{key}</span>
              <input
                type="number"
                min={MIN_STAT}
                max={MAX_STAT}
                value={value}
                onChange={(e) => setStat(key, e.target.valueAsNumber)}
              />
              <span className="stat-cost" title="Kosten für den nächsten Punkt">
                {nextCost === null ? 'max' : `+${nextCost}`}
              </span>
            </label>
          )
        })}
      </div>

      <div className={`stat-budget ${budget.overBudget ? 'over' : ''}`}>
        <div className="budget-bar">
          <div
            className="budget-fill"
            style={{
              width: `${Math.min(100, (budget.spent / budget.available) * 100)}%`,
            }}
          />
        </div>
        <div className="budget-text">
          <span>
            Statuspunkte: <strong>{budget.spent}</strong> / {budget.available}
            {isRebirth && <span className="tag-rebirth"> Rebirth</span>}
          </span>
          {budget.overBudget ? (
            <span className="over-text">
              {Math.abs(budget.remaining)} zu viel für Base-Level {baseLevel}
            </span>
          ) : (
            <span className="ok-text">{budget.remaining} übrig</span>
          )}
        </div>
        <button
          type="button"
          className="ghost small base-from-stats"
          title="Setzt das Base-Level auf das Minimum, das diese Stats erlaubt"
          onClick={() => onSetBaseLevel(minLevelForSpent(budget.spent, isRebirth))}
        >
          Base-Level aus Stats
        </button>
      </div>

      {hexIssues.length > 0 && (
        <p className="hex-warn">
          ⚠ Hexagon-Regel: {hexIssues.map(([a, b]) => `${a}+${b}`).join(', ')}{' '}
          sollten je ≥ 10 sein.
        </p>
      )}
    </div>
  )
}
