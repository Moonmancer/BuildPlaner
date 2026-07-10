import { useStore } from '../store'
import type { Milestone } from '../types'
import { StatsEditor } from './StatsEditor'
import { SkillList } from './SkillList'
import { useConfirm } from './ConfirmDialog'

interface Props {
  milestone: Milestone
  isRebirth: boolean
  maxJobLevel: number
  dragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDropOnMilestone?: () => void
}

/** Ein einklappbarer Milestone: Label, Level, Stats und Skills. */
export function MilestoneCard({
  milestone: m,
  isRebirth,
  maxJobLevel,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOnMilestone,
}: Props) {
  const { updateMilestone, deleteMilestone } = useStore()
  const confirm = useConfirm()

  function patch(p: Partial<Omit<Milestone, 'id'>>) {
    updateMilestone(m.id, p)
  }

  return (
    <details
      className={`milestone${dragging ? ' dragging' : ''}`}
      open
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropOnMilestone}
    >
      <summary>
        <span
          className="ms-drag"
          title="Zum Sortieren ziehen"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => e.preventDefault()}
        >
          ⠿
        </span>
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
            <span>Job-Level (max {maxJobLevel})</span>
            <input
              type="number"
              min={1}
              max={maxJobLevel}
              value={m.jobLevel}
              onChange={(e) =>
                patch({
                  jobLevel: Math.min(
                    maxJobLevel,
                    Math.max(1, Math.round(e.target.valueAsNumber || 1)),
                  ),
                })
              }
            />
          </label>
        </div>

        <h4>Stats</h4>
        <StatsEditor
          stats={m.stats}
          baseLevel={m.baseLevel}
          isRebirth={isRebirth}
          onChange={(stats) => patch({ stats })}
          onSetBaseLevel={(level) => patch({ baseLevel: level })}
        />

        <h4>Skills</h4>
        <SkillList skills={m.skills} onChange={(skills) => patch({ skills })} />

        <div className="ms-actions">
          <button
            type="button"
            className="delete-text"
            onClick={async () => {
              const ok = await confirm({
                title: 'Milestone löschen',
                message: `Milestone „${m.label || 'Unbenannt'}" wirklich löschen?`,
                confirmLabel: 'Löschen',
                danger: true,
              })
              if (ok) deleteMilestone(m.id)
            }}
          >
            Milestone löschen
          </button>
        </div>
      </div>
    </details>
  )
}
