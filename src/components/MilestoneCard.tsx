import { useStore } from '../store'
import type { Milestone } from '../types'
import { StatsEditor } from './StatsEditor'
import { SkillList } from './SkillList'

interface Props {
  buildId: string
  milestone: Milestone
}

/** Ein einklappbarer Milestone: Label, Level, Stats und Skills. */
export function MilestoneCard({ buildId, milestone: m }: Props) {
  const { updateMilestone, deleteMilestone } = useStore()

  function patch(p: Partial<Omit<Milestone, 'id'>>) {
    updateMilestone(buildId, m.id, p)
  }

  return (
    <details className="milestone" open>
      <summary>
        <span className="ms-label">{m.label || 'Unbenannter Milestone'}</span>
        <span className="ms-levels">
          Base {m.baseLevel} · Job {m.jobLevel}
        </span>
      </summary>

      <div className="ms-body">
        <div className="field-row">
          <label className="grow">
            <span>Bezeichnung</span>
            <input
              type="text"
              value={m.label}
              placeholder="z.B. Lvl 10, Endgame…"
              onChange={(e) => patch({ label: e.target.value })}
            />
          </label>
          <label>
            <span>Base-Level</span>
            <input
              type="number"
              min={1}
              max={99}
              value={m.baseLevel}
              onChange={(e) =>
                patch({
                  baseLevel: Math.max(
                    1,
                    Math.round(e.target.valueAsNumber || 1),
                  ),
                })
              }
            />
          </label>
          <label>
            <span>Job-Level</span>
            <input
              type="number"
              min={1}
              max={70}
              value={m.jobLevel}
              onChange={(e) =>
                patch({
                  jobLevel: Math.max(1, Math.round(e.target.valueAsNumber || 1)),
                })
              }
            />
          </label>
        </div>

        <h4>Stats</h4>
        <StatsEditor stats={m.stats} onChange={(stats) => patch({ stats })} />

        <h4>Skills</h4>
        <SkillList skills={m.skills} onChange={(skills) => patch({ skills })} />

        <div className="ms-actions">
          <button
            type="button"
            className="delete-text"
            onClick={() => {
              if (confirm(`Milestone "${m.label}" löschen?`))
                deleteMilestone(buildId, m.id)
            }}
          >
            Milestone löschen
          </button>
        </div>
      </div>
    </details>
  )
}
