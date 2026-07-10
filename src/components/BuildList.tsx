import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { getClass } from '../ro/classes'
import { childrenOf } from '../groupTree'
import { useConfirm, useConfirmChoice } from './ConfirmDialog'
import type { Build, BuildGroup } from '../types'

/** Linke Spalte: Builds anlegen, filtern, in (verschachtelte) Gruppen einordnen,
 *  per Drag&Drop sortieren. Ein Build kann in mehreren Gruppen sein. */
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
    setGroupParent,
    toggleGroupCollapsed,
    deleteGroup,
    selectBuild,
    saveDraft,
    setBuildGroups,
    reorderBuilds,
  } = useStore()
  const confirm = useConfirm()
  const confirmChoice = useConfirmChoice()

  const [name, setName] = useState('')
  const [filter, setFilter] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [groupDragId, setGroupDragId] = useState<string | null>(null)

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
    return true
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
    const union = [...new Set([...dragged.groupIds, ...target.groupIds])]
    if (union.length !== dragged.groupIds.length)
      setBuildGroups(dragId, union)
    const ids = builds.map((b) => b.id).filter((id) => id !== dragId)
    ids.splice(ids.indexOf(targetId), 0, dragId)
    reorderBuilds(ids)
    setDragId(null)
  }

  // Drop auf Sektion: null = aus allen Gruppen entfernen; sonst zur Gruppe hinzufügen.
  function onDropOnGroup(groupId: string | null) {
    if (!dragId) return
    const dragged = builds.find((b) => b.id === dragId)
    if (!dragged) return
    if (groupId === null) setBuildGroups(dragId, [])
    else setBuildGroups(dragId, [...new Set([...dragged.groupIds, groupId])])
    setDragId(null)
  }

  // Drop auf eine Sektion: wird eine GRUPPE gezogen -> umhängen (groupId=null => Top-Level),
  // sonst Build-Zuordnung. Der Store fängt Selbstbezug/Zyklen ab.
  function onSectionDrop(groupId: string | null) {
    if (groupDragId) {
      if (groupDragId !== groupId) setGroupParent(groupDragId, groupId)
      setGroupDragId(null)
      return
    }
    onDropOnGroup(groupId)
  }

  async function confirmDeleteGroup(g: BuildGroup) {
    const ok = await confirm({
      title: 'Gruppe löschen',
      message: `Gruppe „${g.name}" löschen? Builds und Untergruppen bleiben erhalten.`,
      confirmLabel: 'Löschen',
      danger: true,
    })
    if (ok) deleteGroup(g.id)
  }

  const ungrouped = filtered.filter(
    (b) => !b.groupIds.some((id) => groups.some((g) => g.id === id)),
  )

  const rowProps = {
    selectedId,
    dirty,
    dragId,
    onSelect,
    onDropOnBuild,
    onDragStartBuild: setDragId,
    onDragEndBuild: () => setDragId(null),
  }

  function renderGroup(g: BuildGroup, depth: number) {
    const items = filtered.filter((b) => b.groupIds.includes(g.id))
    const kids = childrenOf(groups, g.id)
    // Beim Filtern leere Zweige (ohne Treffer und ohne Kinder mit Treffern) ausblenden.
    if (q && items.length === 0 && kids.length === 0) return null
    return (
      <section
        key={g.id}
        className={`build-section${groupDragId === g.id ? ' dragging' : ''}`}
        style={{ marginLeft: depth ? 12 : 0 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation()
          onSectionDrop(g.id)
        }}
      >
        <div className="group-head">
          <button
            type="button"
            className="group-toggle"
            aria-expanded={!g.collapsed}
            title={g.collapsed ? 'Ausklappen' : 'Einklappen'}
            onClick={() => toggleGroupCollapsed(g.id)}
          >
            {g.collapsed ? '▸' : '▾'}
          </button>
          <span
            className="drag-handle"
            title="Gruppe umhängen (ziehen)"
            draggable
            onDragStart={() => setGroupDragId(g.id)}
            onDragEnd={() => setGroupDragId(null)}
          >
            ⠿
          </span>
          <input
            className="group-name"
            value={g.name}
            aria-label="Gruppenname"
            onChange={(e) => renameGroup(g.id, e.target.value)}
          />
          <button
            type="button"
            className="ghost small"
            title="Untergruppe anlegen"
            onClick={() => createGroup('Untergruppe', g.id)}
          >
            +
          </button>
          <button
            type="button"
            className="delete"
            title="Gruppe löschen"
            onClick={() => confirmDeleteGroup(g)}
          >
            ✕
          </button>
        </div>
        {!g.collapsed && (
          <>
            <ul>
              {items.map((b) => (
                <BuildRow key={b.id} build={b} {...rowProps} />
              ))}
            </ul>
            {kids.map((child) => renderGroup(child, depth + 1))}
          </>
        )}
      </section>
    )
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
          {(ungrouped.length > 0 || groups.length > 0) && (
            <section
              className="build-section"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onSectionDrop(null)}
            >
              {groups.length > 0 && (
                <div className="group-head plain">
                  <span className="group-name-static">
                    Ohne Gruppe / Top-Level
                  </span>
                </div>
              )}
              <ul>
                {ungrouped.map((b) => (
                  <BuildRow key={b.id} build={b} {...rowProps} />
                ))}
              </ul>
            </section>
          )}

          {childrenOf(groups, null).map((g) => renderGroup(g, 0))}

          {q && filtered.length === 0 && (
            <p className="empty small">Kein Build passt zum Filter.</p>
          )}
        </div>
      )}
    </aside>
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
      onDrop={(e) => {
        // Nur wenn ein Build gezogen wird hier behandeln; sonst (Gruppen-Drag)
        // zur Sektion durchreichen (Umhängen).
        if (!dragId) return
        e.stopPropagation()
        onDropOnBuild(b.id)
      }}
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
