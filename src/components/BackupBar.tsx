import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { useConfirm } from './ConfirmDialog'
import {
  fsSupported,
  loadHandle,
  saveHandle,
  clearHandle,
  pickSaveFile,
  pickOpenFile,
  queryPermissionState,
  ensurePermission,
  writeText,
  readText,
  serialize,
  parse,
} from '../fileSync'

type Status = 'unsupported' | 'off' | 'active' | 'needs-permission' | 'error'

/** Steuerleiste für das stille Datei-Backup (File System Access API, Chrome/Edge).
 *  Einmal eine Datei wählen -> danach wird bei jeder Änderung still dorthin geschrieben.
 *  Beim Start: leeres localStorage + vorhandene Sicherung => automatische Wiederherstellung. */
export function BackupBar() {
  const { builds, groups, replaceAll } = useStore()
  const confirm = useConfirm()
  const [status, setStatus] = useState<Status>(
    fsSupported ? 'off' : 'unsupported',
  )
  const [fileName, setFileName] = useState('')
  const handleRef = useRef<FileSystemFileHandle | null>(null)
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didInit = useRef(false)

  // Start: gemerkten Handle laden, Rechte prüfen, ggf. leere App aus Backup heilen.
  useEffect(() => {
    if (didInit.current || !fsSupported) return
    didInit.current = true
    void (async () => {
      const h = await loadHandle().catch(() => null)
      if (!h) return
      handleRef.current = h
      setFileName(h.name)
      if ((await queryPermissionState(h)) !== 'granted') {
        setStatus('needs-permission')
        return
      }
      setStatus('active')
      if (builds.length === 0 && groups.length === 0) {
        const text = await readText(h).catch(() => null)
        const parsed = text ? parse(text) : null
        if (parsed && parsed.builds.length) {
          replaceAll(parsed.builds, parsed.groups)
        }
      }
    })()
    // Nur einmal beim Mount; Abhängigkeiten bewusst leer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stilles Schreiben bei Datenänderung (nur wenn aktiv). Kurz entprellt.
  useEffect(() => {
    if (status !== 'active' || !handleRef.current) return
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => {
      writeText(handleRef.current!, serialize(builds, groups)).catch(() =>
        setStatus('error'),
      )
    }, 400)
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current)
    }
  }, [builds, groups, status])

  async function pick() {
    try {
      const h = await pickSaveFile()
      if (!h) return
      if (!(await ensurePermission(h))) {
        setStatus('needs-permission')
        return
      }
      handleRef.current = h
      setFileName(h.name)
      await saveHandle(h)
      await writeText(h, serialize(builds, groups))
      setStatus('active')
    } catch {
      // Nutzer hat den Datei-Dialog abgebrochen – nichts zu tun.
    }
  }

  async function resume() {
    const h = handleRef.current
    if (!h) return
    if (await ensurePermission(h)) {
      await saveHandle(h)
      setStatus('active')
    }
  }

  async function loadFrom() {
    try {
      const h = await pickOpenFile()
      if (!h) return
      if (!(await ensurePermission(h))) return
      const parsed = parse(await readText(h))
      if (!parsed) {
        await confirm({
          title: 'Laden fehlgeschlagen',
          message: 'Die Datei ist keine gültige BuildPlaner-Sicherung.',
          confirmLabel: 'OK',
        })
        return
      }
      if (builds.length || groups.length) {
        const ok = await confirm({
          title: 'Aus Backup laden',
          message: `Aktuelle Daten (${builds.length} Build(s)) durch die Sicherung „${h.name}" (${parsed.builds.length} Build(s)) ersetzen?`,
          confirmLabel: 'Ersetzen',
          danger: true,
        })
        if (!ok) return
      }
      replaceAll(parsed.builds, parsed.groups)
      handleRef.current = h
      setFileName(h.name)
      await saveHandle(h)
      setStatus('active')
    } catch {
      // Abbruch im Datei-Dialog.
    }
  }

  async function disconnect() {
    await clearHandle().catch(() => {})
    handleRef.current = null
    setFileName('')
    setStatus('off')
  }

  if (status === 'unsupported') {
    return (
      <div
        className="backup-bar"
        title="Direktes Datei-Backup braucht Chrome oder Edge. Nutze sonst den XML-Export."
      >
        <span className="backup-label">
          💾 Auto-Backup nicht verfügbar (Chrome/Edge nötig) – XML-Export nutzen
        </span>
      </div>
    )
  }

  return (
    <div className="backup-bar">
      {status === 'off' && (
        <>
          <span className="backup-label">💾 Auto-Backup aus</span>
          <button type="button" className="ghost small" onClick={pick}>
            Backup-Datei wählen…
          </button>
          <button type="button" className="ghost small" onClick={loadFrom}>
            Aus Backup laden…
          </button>
        </>
      )}
      {status === 'active' && (
        <>
          <span className="backup-label ok">
            💾 Auto-Backup aktiv → {fileName}
          </span>
          <button type="button" className="ghost small" onClick={loadFrom}>
            Aus Backup laden…
          </button>
          <button type="button" className="ghost small" onClick={disconnect}>
            Trennen
          </button>
        </>
      )}
      {status === 'needs-permission' && (
        <>
          <span className="backup-label warn">
            💾 Backup pausiert ({fileName}) – Zugriff bestätigen
          </span>
          <button type="button" className="ghost small" onClick={resume}>
            Fortsetzen
          </button>
          <button type="button" className="ghost small" onClick={disconnect}>
            Trennen
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <span className="backup-label warn">
            💾 Backup-Fehler beim Schreiben
          </span>
          <button type="button" className="ghost small" onClick={pick}>
            Datei neu wählen…
          </button>
          <button type="button" className="ghost small" onClick={disconnect}>
            Trennen
          </button>
        </>
      )}
    </div>
  )
}
