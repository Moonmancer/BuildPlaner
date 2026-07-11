// Share-Link: einen einzelnen Build als kompakten, URL-sicheren Code kodieren.
// Format: base64url(JSON) mit Versionsfeld. Gruppen/IDs/Zeitstempel gehören nicht
// zum geteilten Inhalt – sie werden beim Import frisch vergeben.

import { migrateBuild } from './storage'
import type { Build } from './types'

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Nur die inhaltlichen Felder eines Builds werden geteilt.
interface SharePayload {
  v: number
  build: {
    name: string
    classId: string | null
    charLink?: string
    notes?: string
    earlyJobChangeLevel: number
    milestones: {
      label: string
      baseLevel: number
      jobLevel: number
      stats: Record<string, number>
      skills: Record<string, number>
    }[]
  }
}

/** Kodiert den (Inhalt des) Builds als URL-sicheren Code. */
export function encodeBuild(build: Build): string {
  const payload: SharePayload = {
    v: 1,
    build: {
      name: build.name,
      classId: build.classId,
      charLink: build.charLink || undefined,
      notes: build.notes || undefined,
      earlyJobChangeLevel: build.earlyJobChangeLevel,
      milestones: build.milestones.map((m) => ({
        label: m.label,
        baseLevel: m.baseLevel,
        jobLevel: m.jobLevel,
        stats: m.stats,
        skills: m.skills,
      })),
    },
  }
  return toB64Url(enc.encode(JSON.stringify(payload)))
}

/** Dekodiert einen Share-Code zu einem normalisierten Build (IDs leer → Store vergibt frische).
 *  Gibt null zurück, wenn der Code ungültig ist. */
export function decodeBuild(code: string): Build | null {
  try {
    const json = dec.decode(fromB64Url(code.trim()))
    const parsed = JSON.parse(json) as Partial<SharePayload>
    if (!parsed || typeof parsed !== 'object' || !parsed.build) return null
    return migrateBuild(parsed.build)
  } catch {
    return null
  }
}

/** Baut die vollständige Teilen-URL für einen Build (Code im Hash). */
export function buildShareUrl(build: Build): string {
  return `${location.origin}${location.pathname}#build=${encodeBuild(build)}`
}

/** Liest einen Share-Code aus einem Hash-String (z.B. location.hash) oder gibt null zurück. */
export function shareCodeFromHash(hash: string): string | null {
  const m = hash.match(/[#&]build=([^&]+)/)
  return m ? m[1] : null
}
