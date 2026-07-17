import { useEffect, useState } from 'react'
import { getClass } from '../ro/classes'
import { CLASS_ICON, CLASS_LAYOUT, classIconSrc } from '../classIcons'

interface Props {
  open: boolean
  onSelect: (classId: string) => void
  onClose: () => void
}

/** Modale Klassenauswahl per Portrait (himeyasha), familienweise angeordnet. Bei jedem Öffnen wird
 *  für geschlechts-abhängige Klassen ein zufälliges Portrait (m/f) gewählt. */
export function ClassPickerModal({ open, onSelect, onClose }: Props) {
  // Zufalls-Geschlecht je gegenderter Klasse, neu gewürfelt bei jedem Öffnen.
  const [female, setFemale] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    const roll: Record<string, boolean> = {}
    for (const [id, icon] of Object.entries(CLASS_ICON)) {
      if (typeof icon !== 'string') roll[id] = Math.random() < 0.5
    }
    setFemale(roll)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const codeOf = (id: string) => {
    const icon = CLASS_ICON[id]
    return typeof icon === 'string' ? icon : female[id] ? icon.f : icon.m
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="modal class-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Klasse auswählen"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Klasse wählen</h3>
        <div className="class-picker-grid">
          {CLASS_LAYOUT.map((row, ri) => (
            <div className="class-picker-row" key={ri}>
              {row.map((id, ci) =>
                id == null ? (
                  <div key={ci} className="class-tile-empty" aria-hidden="true" />
                ) : (
                  <button
                    key={ci}
                    type="button"
                    className="class-tile"
                    title={getClass(id)?.name ?? id}
                    onClick={() => onSelect(id)}
                  >
                    <img
                      src={classIconSrc(codeOf(id))}
                      alt={getClass(id)?.name ?? id}
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    />
                    <span>{getClass(id)?.name ?? id}</span>
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
