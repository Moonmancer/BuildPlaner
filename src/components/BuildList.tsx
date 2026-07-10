import { useState, type FormEvent } from 'react'
import { useStore } from '../store'

/** Linke Spalte: alle Builds, auswählen, anlegen, löschen. */
export function BuildList() {
  const { builds, selectedId, selectBuild, createBuild, deleteBuild } =
    useStore()
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createBuild(trimmed)
    setName('')
  }

  return (
    <aside className="build-list">
      <h2>Builds</h2>

      <form className="new-build" onSubmit={submit}>
        <input
          type="text"
          value={name}
          placeholder="Name des Builds…"
          onChange={(e) => setName(e.target.value)}
          aria-label="Name des neuen Builds"
        />
        <button type="submit">+ Anlegen</button>
      </form>

      {builds.length === 0 ? (
        <p className="empty">Noch keine Builds. Lege oben deinen ersten an.</p>
      ) : (
        <ul>
          {builds.map((b) => (
            <li key={b.id} className={b.id === selectedId ? 'active' : ''}>
              <button
                type="button"
                className="select"
                onClick={() => selectBuild(b.id)}
              >
                <span className="build-name">{b.name}</span>
                <span className="build-meta">
                  {b.jobClass || 'ohne Klasse'} · {b.milestones.length} Milestone
                  {b.milestones.length === 1 ? '' : 's'}
                </span>
              </button>
              <button
                type="button"
                className="delete"
                title="Build löschen"
                aria-label={`Build ${b.name} löschen`}
                onClick={() => {
                  if (confirm(`Build "${b.name}" wirklich löschen?`))
                    deleteBuild(b.id)
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
