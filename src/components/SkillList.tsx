import { useStore } from '../store'
import type { SkillEntry } from '../types'

interface Props {
  skills: SkillEntry[]
  onChange: (skills: SkillEntry[]) => void
}

/** Einfache Skill-Liste (Freitext + Level).
 *  In Phase 3 wird der Freitext durch eine Auswahl aus dem Skill-Baum ersetzt. */
export function SkillList({ skills, onChange }: Props) {
  const { newSkill } = useStore()

  function update(id: string, patch: Partial<SkillEntry>) {
    onChange(skills.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  function remove(id: string) {
    onChange(skills.filter((s) => s.id !== id))
  }
  function add() {
    onChange([...skills, newSkill()])
  }

  return (
    <div className="skill-list">
      {skills.length === 0 && (
        <p className="empty small">Noch keine Skills erfasst.</p>
      )}
      {skills.map((s) => (
        <div key={s.id} className="skill-row">
          <input
            type="text"
            className="skill-name"
            placeholder="Skill-Name…"
            value={s.name}
            onChange={(e) => update(s.id, { name: e.target.value })}
          />
          <input
            type="number"
            className="skill-level"
            min={1}
            max={10}
            value={s.level}
            aria-label="Skill-Level"
            onChange={(e) =>
              update(s.id, {
                level: Math.max(1, Math.round(e.target.valueAsNumber || 1)),
              })
            }
          />
          <button
            type="button"
            className="delete"
            title="Skill entfernen"
            onClick={() => remove(s.id)}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="add-skill" onClick={add}>
        + Skill hinzufügen
      </button>
    </div>
  )
}
