import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useStore } from '../store'
import { getClass } from '../ro/classes'
import { useConfirm } from './ConfirmDialog'
import type { Build, BuildGroup } from '../types'

/** Linke Spalte: Builds anlegen, filtern, gruppieren, per Drag&Drop sortieren. */
export function BuildList() {
  const {
    builds,
    groups,
    selectedId,
    createBuild,
    createGroup,
    renameGroup,
    deleteGroup,
    updateBuild,
    reorderBuilds,
  } = useStore()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [filter, setFilter] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)

  const q = filter.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      builds.filter((b) => {
        if (!q) return true
        const cls = getClass(b.classId)?.name.toLowerCase() ?? ''
        return b.name.toLowerCase().includes(q) || cls.includes(q)
      }),
    [builds, q],
  )

  function submitBuild(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    createBuild(trimmed)
    setName('')
  }

  function submitGroup(e: FormEvent) {
    e.preventDefault()
    if (!newGroup.trim()) return
    createGroup(newGroup)
    setNewGroup('')
    setShowGroupInput(false)
  }

  // Drop auf einen anderen Build: davor einsortieren und dessen Gruppe übernehmen.
  function onDropOnBuild(targetId: string) {
    if (!dragId || dragId === targetId) return
    const target = builds.find((b) => b.id === targetId)
    const dragged = builds.find((b) => b.id === dragId)
    if (!target || !dragged) return
    if (dragged.groupId !== target.groupId)
      updateBuild(dragId, { groupId: target.groupId })
    const ids = builds.map((b) => b.id).filter((id) => id !== dragId)
    ids.splice(ids.indexOf(targetId), 0, dragId)
    reorderBuilds(ids)
    setDragId(null)
  }

  // Drop auf eine Sektionsüberschrift: nur der Gruppe zuordnen.
  function onDropOnGroup(groupId: string | null) {
    if (!dragId) return
    updateBuild(dragId, { groupId })
    setDragId(null)
  }

  async function confirmDeleteGroup(g: BuildGroup) {
    const ok = await confirm({
      title: 'Gruppe löschen',
      message: `Gruppe „${g.name}" löschen? Die Builds bleiben erhalten und werden „ohne Gruppe".`,
      confirmLabel: 'Löschen',
      danger: true,
    })
    if (ok) deleteGroup(g.id)
  }

  const ungrouped = filtered.filter(
    (b) => !b.groupId || !groups.some((g) => g.id === b.groupId),
  )

  const shared = {
    selectedId,
    dragId,
    onDragStartBuild: setDragId,
    onDragEndBuild: () => setDragId(null),
    onDropOnBuild,
  }

  return (
    <aside className="build-list">
      <div className="list-head">
        <h2>Builds</h2>
        <button
          type="button"
          className="ghost small"
          onClick={() => setShowGroupInput((v) => !v)}
          title="Neue Gruppe anlegen"
        >
          + Gruppe
        </button>
      </div>

      <form className="new-build" onSubmit={submitBuild}>
        <input
          type="text"
          value={name}
          placeholder="Name des Builds…"
          onChange={(e) => setName(e.target.value)}
          aria-label="Name des neuen Builds"
        />
        <button type="submit">+ Build</button>
      </form>

      {showGroupInput && (
        <form className="new-build" onSubmit={submitGroup}>
          <input
            type="text"
            value={newGroup}
            placeholder="Name der Gruppe…"
            onChange={(e) => setNewGroup(e.target.value)}
            aria-label="Name der neuen Gruppe"
            autoFocus
          />
          <button type="submit">Anlegen</button>
        </form>
      )}

      {builds.length > 3 && (
        <input
          type="text"
          className="filter-input"
          value={filter}
          placeholder="Builds filtern…"
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Builds filtern"
        />
      )}

      {builds.length === 0 ? (
        <p className="empty">Noch keine Builds. Lege oben deinen ersten an.</p>
      ) : (
        <div className="build-sections">
          {ungrouped.length > 0 && (
            <BuildSection
              label={groups.length > 0 ? 'Ohne Gruppe' : null}
              items={ungrouped}
              onDropOnSection={() => onDropOnGroup(null)}
              {...shared}
            />
          )}

          {groups.map((g) => {
            const items = filtered.filter((b) => b.groupId === g.id)
            if (q && items.length === 0) return null
            return (
              <BuildSection
                key={g.id}
                group={g}
                items={items}
                onDropOnSection={() => onDropOnGroup(g.id)}
                onRename={(nm) => renameGroup(g.id, nm)}
                onDelete={() => confirmDeleteGroup(g)}
                {...shared}
              />
            )
          })}

          {q && filtered.length === 0 && (
            <p className="empty small">Kein Build passt zum Filter.</p>
          )}
        </div>
      )}
    </aside>
  )
}

interface SectionProps {
  label?: string | null
  group?: BuildGroup
  items: Build[]
  selectedId: string | null
  dragId: string | null
  onDropOnSection: () => void
  onDropOnBuild: (id: string) => void
  onDragStartBuild: (id: string) => void
  onDragEndBuild: () => void
  onRename?: (name: string) => void
  onDelete?: () => void
}

function BuildSection({
  label,
  group,
  items,
  onDropOnSection,
  onRename,
  onDelete,
  ...row
}: SectionProps) {
  return (
    <section
      className="build-section"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropOnSection}
    >
      {group ? (
        <div className="group-head">
          <input
            className="group-name"
            value={group.name}
            aria-label="Gruppenname"
            onChange={(e) => onRename?.(e.target.value)}
          />
          <button
            type="button"
            className="delete"
            title="Gruppe löschen"
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      ) : label ? (
        <div className="group-head plain">
          <span className="group-name-static">{label}</span>
        </div>
      ) : null}
      <ul>
        {items.map((b) => (
          <BuildRow key={b.id} build={b} {...row} />
        ))}
      </ul>
    </section>
  )
}

interface RowProps {
  build: Build
  selectedId: string | null
  dragId: string | null
  onDropOnBuild: (id: string) => void
  onDragStartBuild: (id: string) => void
  onDragEndBuild: () => void
}

function BuildRow({
  build: b,
  selectedId,
  dragId,
  onDropOnBuild,
  onDragStartBuild,
  onDragEndBuild,
}: RowProps): ReactNode {
  const { selectBuild, deleteBuild } = useStore()
  const confirm = useConfirm()

  return (
    <li
      className={`build-item${b.id === selectedId ? ' active' : ''}${dragId === b.id ? ' dragging' : ''}`}
      draggable
      onDragStart={() => onDragStartBuild(b.id)}
      onDragEnd={onDragEndBuild}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropOnBuild(b.id)}
    >
      <span className="drag-handle" title="Zum Sortieren ziehen" aria-hidden>
        ⠿
      </span>
      <button type="button" className="select" onClick={() => selectBuild(b.id)}>
        <span className="build-name">{b.name}</span>
        <span className="build-meta">
          {getClass(b.classId)?.name ?? 'ohne Klasse'} · {b.milestones.length}{' '}
          Milestone{b.milestones.length === 1 ? '' : 's'}
        </span>
      </button>
      <button
        type="button"
        className="delete"
        title="Build löschen"
        aria-label={`Build ${b.name} löschen`}
        onClick={async () => {
          const ok = await confirm({
            title: 'Build löschen',
            message: `Build „${b.name}" mit allen Milestones wirklich löschen?`,
            confirmLabel: 'Löschen',
            danger: true,
          })
          if (ok) deleteBuild(b.id)
        }}
      >
        ✕
      </button>
    </li>
  )
}
