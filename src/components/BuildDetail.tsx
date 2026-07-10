import { useState } from 'react'
import { useStore } from '../store'
import { MilestoneCard } from './MilestoneCard'
import { ClassSelect } from './ClassSelect'
import { orderedGroups } from '../groupTree'

/** Findet http/https-URLs in einem Text (für anklickbare Notiz-Links). */
function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g) ?? []
  return [...new Set(matches)]
}

/** Rechte Spalte: Details des ausgewählten Builds inkl. seiner Milestones.
 *  Bearbeitet wird die Draft-Kopie; Änderungen werden erst per Save übernommen. */
export function BuildDetail() {
  const {
    draft,
    dirty,
    groups,
    selectedBuild,
    updateDraft,
    toggleBuildGroup,
    addMilestone,
    reorderMilestones,
    saveDraft,
    discardDraft,
  } = useStore()
  const [msDragId, setMsDragId] = useState<string | null>(null)

  if (!draft) {
    return (
      <section className="build-detail empty-detail">
        <p>Kein Build ausgewählt. Wähle links einen aus oder lege einen an.</p>
      </section>
    )
  }

  const b = draft
  const noteUrls = extractUrls(b.notes)

  function onDropOnMilestone(targetId: string) {
    if (!msDragId || msDragId === targetId) return
    const ids = b.milestones.map((m) => m.id).filter((id) => id !== msDragId)
    ids.splice(ids.indexOf(targetId), 0, msDragId)
    reorderMilestones(ids)
    setMsDragId(null)
  }

  return (
    <section className="build-detail">
      <div className={`save-bar${dirty ? ' dirty' : ''}`}>
        <span className="save-state">
          {dirty ? '● Ungespeicherte Änderungen' : '✓ Gespeichert'}
        </span>
        <div className="save-actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={!dirty}
            onClick={discardDraft}
          >
            Verwerfen
          </button>
          <button type="button" disabled={!dirty} onClick={saveDraft}>
            Speichern
          </button>
        </div>
      </div>

      <div className="detail-head">
        <label className="grow">
          <span>Build-Name</span>
          <input
            type="text"
            className="build-title"
            value={b.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
          />
        </label>
        <label>
          <span>Klasse</span>
          <ClassSelect
            value={b.classId}
            onChange={(classId) => updateDraft({ classId })}
          />
        </label>
      </div>

      {groups.length > 0 && (
        <div className="groups-field">
          <span className="field-label">Gruppen</span>
          <div className="group-checks">
            {orderedGroups(groups).map(({ group, depth }) => {
              const checked = selectedBuild?.groupIds.includes(group.id) ?? false
              return (
                <label
                  key={group.id}
                  className="group-check"
                  style={{ paddingLeft: `${depth * 16}px` }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBuildGroup(b.id, group.id)}
                  />
                  {group.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <label className="char-link">
        <span>Link zum Char</span>
        <div className="link-row">
          <input
            type="url"
            value={b.charLink}
            placeholder="https://…"
            onChange={(e) => updateDraft({ charLink: e.target.value })}
          />
          {b.charLink.trim() && (
            <a
              className="open-link"
              href={b.charLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              ↗ öffnen
            </a>
          )}
        </div>
      </label>

      <label className="notes">
        <span>Notizen</span>
        <textarea
          rows={2}
          value={b.notes}
          placeholder="Freie Notizen zum Build… (URLs werden anklickbar)"
          onChange={(e) => updateDraft({ notes: e.target.value })}
        />
      </label>
      {noteUrls.length > 0 && (
        <div className="note-links">
          {noteUrls.map((u) => (
            <a
              key={u}
              href={u}
              target="_blank"
              rel="noopener noreferrer"
              className="note-link"
            >
              🔗 {u.length > 42 ? u.slice(0, 42) + '…' : u}
            </a>
          ))}
        </div>
      )}

      <div className="milestones-head">
        <h3>Milestones</h3>
        <button type="button" onClick={addMilestone}>
          + Milestone
        </button>
      </div>

      <div className="milestones">
        {b.milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            dragging={msDragId === m.id}
            onDragStart={() => setMsDragId(m.id)}
            onDragEnd={() => setMsDragId(null)}
            onDropOnMilestone={() => onDropOnMilestone(m.id)}
          />
        ))}
      </div>
    </section>
  )
}
