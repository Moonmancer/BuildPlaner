import { useStore } from '../store'
import { MilestoneCard } from './MilestoneCard'

/** Rechte Spalte: Details des ausgewählten Builds inkl. seiner Milestones. */
export function BuildDetail() {
  const { selectedBuild, updateBuild, addMilestone } = useStore()

  if (!selectedBuild) {
    return (
      <section className="build-detail empty-detail">
        <p>Kein Build ausgewählt. Wähle links einen aus oder lege einen an.</p>
      </section>
    )
  }

  const b = selectedBuild

  return (
    <section className="build-detail">
      <div className="detail-head">
        <label className="grow">
          <span>Build-Name</span>
          <input
            type="text"
            className="build-title"
            value={b.name}
            onChange={(e) => updateBuild(b.id, { name: e.target.value })}
          />
        </label>
        <label>
          <span>Klasse</span>
          <input
            type="text"
            value={b.jobClass}
            placeholder="z.B. Knight (Phase 3: Auswahl)"
            onChange={(e) => updateBuild(b.id, { jobClass: e.target.value })}
          />
        </label>
      </div>

      <label className="notes">
        <span>Notizen</span>
        <textarea
          rows={2}
          value={b.notes}
          placeholder="Freie Notizen zum Build…"
          onChange={(e) => updateBuild(b.id, { notes: e.target.value })}
        />
      </label>

      <div className="milestones-head">
        <h3>Milestones</h3>
        <button type="button" onClick={() => addMilestone(b.id)}>
          + Milestone
        </button>
      </div>

      {b.milestones.length === 0 ? (
        <p className="empty">
          Noch keine Milestones. Füge z.B. „Lvl 10" mit den passenden Stats &amp;
          Skills hinzu.
        </p>
      ) : (
        <div className="milestones">
          {b.milestones.map((m) => (
            <MilestoneCard key={m.id} buildId={b.id} milestone={m} />
          ))}
        </div>
      )}
    </section>
  )
}
