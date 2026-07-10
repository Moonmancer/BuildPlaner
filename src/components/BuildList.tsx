import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { getClass } from '../ro/classes'
import { useConfirm, useConfirmChoice } from './ConfirmDialog'
import type { Build, BuildGroup } from '../types'

/** Linke Spalte: Builds anlegen, filtern, gruppieren, per Drag&Drop sortieren. */
export function BuildList() {
  const {
    builds,
    groups,
    selectedId,
    draft,
    dirty,
    createBuild,
    createGroup,
    renameGroup,
    deleteGroup,
    selectBuild,
    saveDraft,
    setBuildGroup,
    reorderBuilds,
  } = useStore()
  const confirm = useConfirm()
  const confirmChoice = useConfirmChoice()

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

  /** Prüft vor dem Verlassen des aktuellen Builds auf ungespeicherte Änderungen. */
  async function guard(): Promise<boolean> {
    if (!dirty) return true
    const c = await confirmChoice({
      title: 'Ungespeicherte Änderungen',
      message: `Der Build „${draft?.name ?? ''}" hat ungespeicherte Änderungen.`,
      confirmLabel: 'Speichern',
      thirdLabel: 'Verwerfen',
      cancelLabel: 'Abbrechen',
    })
    if (c === 'cancel') return false
    if (c === 'confirm') saveDraft()
    return true // 'third' = verwerfen (Wechsel setzt Draft ohnehin zurück)
  }

  async function onSelect(id: string) {
    if (id === selectedId) return
    if (await guard()) selectBuild(id)
  }

  async function submitBuild(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (!(await guard())) return
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

  function onDropOnBuild(targetId: string) {
    if (!dragId || dragId === targetId) return
    const target = builds.find((b) => b.id === targetId)
    const dragged = builds.find((b) => b.id === dragId)
    if (!target || !dragged) return
    if (dragged.groupId !== target.groupId)
      setBuildGroup(dragId, target.groupId)
    const ids = builds.map((b) => b.id).filter((id) => id !== dragId)
    ids.splice(ids.indexOf(targetId), 0, dragId)
    reorderBuilds(ids)
    setDragId(null)
  }

  function onDropOnGroup(groupId: string | null) {
    if (!dragId) return
    setBuildGroup(dragId, groupId)
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
    dirty,
    dragId,
    onSelect,
    onDropOnBuild,
    onDragStartBuild: setDragId,
    onDragEndBuild: () => setDragId(null),
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
  dirty: boolean
  dragId: string | null
  onSelect: (id: string) => void
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
  dirty: boolean
  dragId: string | null
  onSelect: (id: string) => void
  onDropOnBuild: (id: string) => void
  onDragStartBuild: (id: string) => void
  onDragEndBuild: () => void
}

function BuildRow({
  build: b,
  selectedId,
  dirty,
  dragId,
  onSelect,
  onDropOnBuild,
  onDragStartBuild,
  onDragEndBuild,
}: RowProps) {
  const { deleteBuild } = useStore()
  const confirm = useConfirm()
  const isSelected = b.id === selectedId

  return (
    <li
      className={`build-item${isSelected ? ' active' : ''}${dragId === b.id ? ' dragging' : ''}`}
      draggable
      onDragStart={() => onDragStartBuild(b.id)}
      onDragEnd={onDragEndBuild}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropOnBuild(b.id)}
    >
      <span className="drag-handle" title="Zum Sortieren ziehen" aria-hidden>
        ⠿
      </span>
      <button type="button" className="select" onClick={() => onSelect(b.id)}>
        <span className="build-name">
          {isSelected && dirty && (
            <span className="dirty-dot" title="Ungespeichert" aria-hidden>
              ●{' '}
            </span>
          )}
          {b.name}
        </span>
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
