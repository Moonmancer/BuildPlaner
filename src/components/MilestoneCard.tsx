import { useStore } from '../store'
import type { Milestone } from '../types'
import { StatsEditor } from './StatsEditor'
import { SkillList } from './SkillList'
import { useConfirm } from './ConfirmDialog'

interface Props {
  buildId: string
  milestone: Milestone
  dragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDropOnMilestone?: () => void
}

/** Ein einklappbarer Milestone: Label, Level, Stats und Skills. */
export function MilestoneCard({
  buildId,
  milestone: m,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOnMilestone,
}: Props) {
  const { updateMilestone, deleteMilestone } = useStore()
  const confirm = useConfirm()

  function patch(p: Partial<Omit<Milestone, 'id'>>) {
    updateMilestone(buildId, m.id, p)
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
        <StatsEditor
          stats={m.stats}
          baseLevel={m.baseLevel}
          onChange={(stats) => patch({ stats })}
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
              if (ok) deleteMilestone(buildId, m.id)
            }}
          >
            Milestone löschen
          </button>
        </div>
      </div>
    </details>
  )
}
