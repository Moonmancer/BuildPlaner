import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CLASSES,
  TIER_LABELS,
  TIER_ORDER,
  getClass,
  type ClassTier,
  type JobClass,
} from '../ro/classes'
import { ClassPickerModal } from './ClassPickerModal'

interface Props {
  value: string | null
  onChange: (classId: string | null) => void
}

/** Combobox zur Klassenauswahl: Dropdown + Live-Textsuche + Tastatur-Navigation. */
export function ClassSelect({ value, onChange }: Props) {
  const selected = getClass(value)
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Gefilterte, flache Trefferliste (für Tastatur-Navigation), nach Tier sortiert.
  const results = useMemo<JobClass[]>(() => {
    const q = query.trim().toLowerCase()
    const matched = CLASSES.filter((c) => !q || c.name.toLowerCase().includes(q))
    return matched.sort(
      (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
    )
  }, [query])

  // Nach Tier gruppiert (Reihenfolge der results beibehalten).
  const groups = useMemo(() => {
    const map = new Map<ClassTier, JobClass[]>()
    for (const c of results) {
      const arr = map.get(c.tier) ?? []
      arr.push(c)
      map.set(c.tier, arr)
    }
    return [...map.entries()]
  }, [results])

  // Klick außerhalb schließt das Dropdown.
  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function openList() {
    setQuery('')
    // Auf die bereits gewählte Klasse springen (statt immer oben zu starten).
    const sorted = CLASSES.slice().sort(
      (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
    )
    const idx = sorted.findIndex((c) => c.id === value)
    setActive(idx < 0 ? 0 : idx)
    setOpen(true)
  }

  // Beim Öffnen die gewählte Klasse in den sichtbaren Bereich der Liste scrollen.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>('.class-option.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [open])

  function choose(c: JobClass | null) {
    onChange(c ? c.id : null)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      openList()
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[active]) choose(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="class-select" ref={rootRef}>
      <div className="class-select-field">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="class-listbox"
        placeholder="Klasse suchen oder wählen…"
        value={open ? query : (selected?.name ?? '')}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          if (!open) setOpen(true)
        }}
        onFocus={openList}
        onKeyDown={onKeyDown}
      />
      {selected && !open && (
        <button
          type="button"
          className="class-clear"
          title="Klasse entfernen"
          aria-label="Klasse entfernen"
          onMouseDown={(e) => {
            e.preventDefault()
            choose(null)
          }}
        >
          ✕
        </button>
      )}

      {open && (
        <ul className="class-listbox" id="class-listbox" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <li className="class-empty">Keine Klasse gefunden</li>
          )}
          {groups.map(([tier, items]) => (
            <li key={tier} className="class-group">
              <div className="class-group-label">{TIER_LABELS[tier]}</div>
              <ul>
                {items.map((c) => {
                  const idx = results.indexOf(c)
                  return (
                    <li
                      key={c.id}
                      role="option"
                      aria-selected={c.id === value}
                      className={`class-option${idx === active ? ' active' : ''}${c.id === value ? ' selected' : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        choose(c)
                      }}
                    >
                      <span>{c.name}</span>
                      <span className="class-opt-meta">Job max {c.maxJobLevel}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      </div>
      <button
        type="button"
        className="class-picker-btn"
        title="Klasse aus Bildern wählen"
        aria-label="Klasse aus Bildern wählen"
        onClick={() => setPickerOpen(true)}
      >
        ▦
      </button>
      <ClassPickerModal
        open={pickerOpen}
        onSelect={(id) => {
          onChange(id)
          setPickerOpen(false)
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
