import { STATS, type Stats, type StatKey } from '../types'

interface Props {
  stats: Stats
  onChange: (stats: Stats) => void
}

/** Editor für die sechs Grundattribute. Validierung (Punktebudget) folgt in Phase 3. */
export function StatsEditor({ stats, onChange }: Props) {
  function setStat(key: StatKey, value: number) {
    const v = Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1
    onChange({ ...stats, [key]: v })
  }

  return (
    <div className="stats-grid">
      {STATS.map((key) => (
        <label key={key} className="stat">
          <span className="stat-key">{key}</span>
          <input
            type="number"
            min={1}
            value={stats[key]}
            onChange={(e) => setStat(key, e.target.valueAsNumber)}
          />
        </label>
      ))}
    </div>
  )
}
