import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { dataToXml, exportCollectionXml } from '../xml'
import { loadLastExport, computeSignature } from '../storage'

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000

/** Warn-Banner, das nach ≥3 Wochen ohne (aktuellen) XML-Export daran erinnert, den Stand zu sichern.
 *  Erscheint nur, wenn es seit dem letzten Export tatsächlich Änderungen gibt. */
export function ExportReminder() {
  const { builds, groups } = useStore()
  const [dismissed, setDismissed] = useState(false)
  const [tick, setTick] = useState(0)

  // Nach einem Export (auch über die Toolbar) neu bewerten -> Banner verschwindet sofort.
  useEffect(() => {
    const onExported = () => setTick((t) => t + 1)
    window.addEventListener('buildplaner:exported', onExported)
    return () => window.removeEventListener('buildplaner:exported', onExported)
  }, [])

  const info = useMemo(() => {
    if (builds.length === 0) return null
    const signature = computeSignature(dataToXml(builds, groups))
    const last = loadLastExport()
    const hasChanges = !last || last.signature !== signature
    if (!hasChanges) return null
    // 3-Wochen-Fenster relativ zum letzten Export; nie exportiert -> ab dem ältesten Build.
    const refIso =
      last?.at ??
      builds.reduce(
        (min, b) => (b.createdAt < min ? b.createdAt : min),
        builds[0].createdAt,
      )
    const ageMs = Date.now() - new Date(refIso).getTime()
    if (ageMs < THREE_WEEKS_MS) return null
    return { everExported: !!last, days: Math.floor(ageMs / 86_400_000) }
    // tick erzwingt Neubewertung nach einem Export (Signatur in localStorage geändert).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builds, groups, tick])

  if (!info || dismissed) return null

  return (
    <div className="export-reminder" role="alert">
      <span className="reminder-text">
        ⚠{' '}
        {info.everExported
          ? `Letzter XML-Export vor ${info.days} Tagen – seitdem gibt es ungesicherte Änderungen.`
          : `Deine Builds wurden noch nie als XML gesichert (seit ${info.days} Tagen).`}{' '}
        Empfehlung: aktuellen Stand exportieren.
      </span>
      <div className="reminder-actions">
        <button type="button" onClick={() => exportCollectionXml(builds, groups)}>
          Jetzt exportieren
        </button>
        <button
          type="button"
          className="ghost small"
          onClick={() => setDismissed(true)}
        >
          Später
        </button>
      </div>
    </div>
  )
}
