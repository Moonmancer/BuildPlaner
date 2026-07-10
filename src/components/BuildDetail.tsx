import { useState } from 'react'
import { useStore } from '../store'
import { MilestoneCard } from './MilestoneCard'
import { ClassSelect } from './ClassSelect'

/** Findet http/https-URLs in einem Text (für anklickbare Notiz-Links). */
function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/g) ?? []
  return [...new Set(matches)]
}

/** Rechte Spalte: Details des ausgewählten Builds inkl. seiner Milestones. */
export function BuildDetail() {
  const { selectedBuild, groups, updateBuild, addMilestone, reorderMilestones } =
    useStore()
  const [msDragId, setMsDragId] = useState<string | null>(null)

  if (!selectedBuild) {
    return (
      <section className="build-detail empty-detail">
        <p>Kein Build ausgewählt. Wähle links einen aus oder lege einen an.</p>
      </section>
    )
  }

  const b = selectedBuild
  const noteUrls = extractUrls(b.notes)

  function onDropOnMilestone(targetId: string) {
    if (!msDragId || msDragId === targetId) return
    const ids = b.milestones.map((m) => m.id).filter((id) => id !== msDragId)
    ids.splice(ids.indexOf(targetId), 0, msDragId)
    reorderMilestones(b.id, ids)
    setMsDragId(null)
  }

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
          <ClassSelect
            value={b.classId}
            onChange={(classId) => updateBuild(b.id, { classId })}
          />
        </label>
        <label>
          <span>Gruppe</span>
          <select
            value={b.groupId ?? ''}
            onChange={(e) =>
              updateBuild(b.id, { groupId: e.target.value || null })
            }
          >
            <option value="">— ohne Gruppe —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="char-link">
        <span>Link zum Char</span>
        <div className="link-row">
          <input
            type="url"
            value={b.charLink}
            placeholder="https://…"
            onChange={(e) => updateBuild(b.id, { charLink: e.target.value })}
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
          onChange={(e) => updateBuild(b.id, { notes: e.target.value })}
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
        <button type="button" onClick={() => addMilestone(b.id)}>
          + Milestone
        </button>
      </div>

      <div className="milestones">
        {b.milestones.map((m) => (
          <MilestoneCard
            key={m.id}
            buildId={b.id}
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
