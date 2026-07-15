import { useStore } from '../store'
import type { Milestone } from '../types'
import { StatsEditor } from './StatsEditor'
import { SkillTree } from './SkillTree'
import { useConfirm } from './ConfirmDialog'
import { encodeArcadia } from '../arcadia'
import { jobLevelFromSkills } from '../ro/skills'

interface Props {
  milestone: Milestone
  classId: string | null
  isRebirth: boolean
  maxJobLevel: number
  earlyJobChangeLevel: number
  dragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDropOnMilestone?: () => void
}

/** Ein einklappbarer Milestone: Label, Level, Stats und Skills. */
export function MilestoneCard({
  milestone: m,
  classId,
  isRebirth,
  maxJobLevel,
  earlyJobChangeLevel,
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

  // Job-Level wird automatisch aus den verteilten Skillpunkten abgeleitet (1 Punkt = 1 Job-Level).
  const derivedJobLevel = jobLevelFromSkills(classId, m.skills, earlyJobChangeLevel)

  // Arcadia-Link für diesen Snapshot (nur wenn die Klasse dort existiert).
  const arcadiaUrl = encodeArcadia(
    classId,
    m.baseLevel,
    derivedJobLevel,
    m.stats,
    m.skills,
  )

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
          <span className="ms-lvl">
            Base<b>{m.baseLevel}</b>
          </span>
          <span className="ms-lvl">
            Job<b>{derivedJobLevel}</b>
          </span>
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
              value={derivedJobLevel}
              readOnly
              tabIndex={-1}
              title="Wird automatisch aus den verteilten Skillpunkten berechnet (1 Punkt = 1 Job-Level)."
            />
          </label>
        </div>

        <div className="ms-actions">
          {arcadiaUrl && (
            <a
              className="arcadia-link"
              href={arcadiaUrl}
              target="_blank"
              rel="noopener noreferrer"
              // Immer in neuem Tab öffnen (auch in der installierten PWA).
              onClick={(e) => {
                e.preventDefault()
                window.open(arcadiaUrl, '_blank', 'noopener,noreferrer')
              }}
              title="Diesen Milestone im Arcadia-Rechner öffnen (Klasse, Level, Stats, Kampf-Skills)"
            >
              ⚔ In Arcadia Calc öffnen ↗
            </a>
          )}
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

        <h4>Stats</h4>
        <StatsEditor
          stats={m.stats}
          baseLevel={m.baseLevel}
          isRebirth={isRebirth}
          onChange={(stats) => patch({ stats })}
          onSetBaseLevel={(level) => patch({ baseLevel: level })}
        />

        <h4>Skills</h4>
        <SkillTree
          classId={classId}
          levels={m.skills}
          earlyJobChangeLevel={earlyJobChangeLevel}
          onChange={(skills) =>
            patch({
              skills,
              jobLevel: jobLevelFromSkills(classId, skills, earlyJobChangeLevel),
            })
          }
        />
      </div>
    </details>
  )
}
