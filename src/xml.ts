// XML Im-/Export für Backup/Transfer ganzer Sammlungen (Builds + Gruppen).
// Bewusst schema-einfach und tolerant; Normalisierung läuft über die storage-Helfer.

import {
  migrateBuild,
  migrateGroups,
  saveLastExport,
  computeSignature,
} from './storage'
import type { Build, BuildGroup } from './types'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Serialisiert Builds + Gruppen als XML-Dokument (String). */
export function dataToXml(builds: Build[], groups: BuildGroup[]): string {
  const out: string[] = []
  out.push('<?xml version="1.0" encoding="UTF-8"?>')
  out.push('<buildplaner version="1">')

  out.push('  <groups>')
  for (const g of groups) {
    out.push(
      `    <group id="${esc(g.id)}" name="${esc(g.name)}" parent="${esc(
        g.parentId ?? '',
      )}" collapsed="${g.collapsed ? '1' : '0'}"/>`,
    )
  }
  out.push('  </groups>')

  out.push('  <builds>')
  for (const b of builds) {
    out.push(
      `    <build name="${esc(b.name)}" class="${esc(
        b.classId ?? '',
      )}" earlyJobChange="${b.earlyJobChangeLevel}" charLink="${esc(
        b.charLink,
      )}" groups="${esc(b.groupIds.join(' '))}">`,
    )
    if (b.notes) out.push(`      <notes>${esc(b.notes)}</notes>`)
    for (const m of b.milestones) {
      out.push(
        `      <milestone label="${esc(m.label)}" base="${m.baseLevel}" job="${m.jobLevel}">`,
      )
      const s = m.stats
      out.push(
        `        <stats str="${s.STR}" agi="${s.AGI}" vit="${s.VIT}" int="${s.INT}" dex="${s.DEX}" luk="${s.LUK}"/>`,
      )
      const skills = Object.entries(m.skills).filter(([, lvl]) => lvl > 0)
      if (skills.length > 0) {
        out.push('        <skills>')
        for (const [id, lvl] of skills) {
          out.push(`          <skill id="${esc(id)}" level="${lvl}"/>`)
        }
        out.push('        </skills>')
      }
      out.push('      </milestone>')
    }
    out.push('    </build>')
  }
  out.push('  </builds>')

  out.push('</buildplaner>')
  return out.join('\n')
}

/** Parst ein BuildPlaner-XML-Dokument. Gibt null zurück, wenn es nicht lesbar ist. */
export function parseXml(
  text: string,
): { builds: Build[]; groups: BuildGroup[] } | null {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml')
  } catch {
    return null
  }
  if (doc.querySelector('parsererror') || !doc.querySelector('buildplaner')) {
    return null
  }

  const groupsRaw = [...doc.querySelectorAll('groups > group')].map((el) => ({
    id: el.getAttribute('id') ?? '',
    name: el.getAttribute('name') ?? '',
    parentId: el.getAttribute('parent') || null,
    collapsed: el.getAttribute('collapsed') === '1',
  }))

  const buildsRaw = [...doc.querySelectorAll('builds > build')].map((el) => {
    const milestones = [...el.querySelectorAll('milestone')].map((mel) => {
      const st = mel.querySelector('stats')
      const num = (a: string) => Number(st?.getAttribute(a)) || 1
      const skills: Record<string, number> = {}
      for (const sel of mel.querySelectorAll('skills > skill')) {
        const id = sel.getAttribute('id')
        const lvl = Number(sel.getAttribute('level'))
        if (id && lvl > 0) skills[id] = lvl
      }
      return {
        label: mel.getAttribute('label') ?? 'Milestone',
        baseLevel: Number(mel.getAttribute('base')) || 1,
        jobLevel: Number(mel.getAttribute('job')) || 1,
        stats: {
          STR: num('str'),
          AGI: num('agi'),
          VIT: num('vit'),
          INT: num('int'),
          DEX: num('dex'),
          LUK: num('luk'),
        },
        skills,
      }
    })
    return {
      name: el.getAttribute('name') ?? 'Build',
      classId: el.getAttribute('class') || null,
      charLink: el.getAttribute('charLink') ?? '',
      earlyJobChangeLevel: Number(el.getAttribute('earlyJobChange')) || 50,
      groupIds: (el.getAttribute('groups') ?? '').split(/\s+/).filter(Boolean),
      notes: el.querySelector('notes')?.textContent ?? '',
      milestones,
    }
  })

  return {
    builds: buildsRaw.map(migrateBuild),
    groups: migrateGroups(groupsRaw),
  }
}

/** Exportiert die ganze Sammlung als XML-Download und merkt sich Zeitpunkt + Inhalts-Signatur
 *  (für die Backup-Erinnerung). Löst zudem ein `buildplaner:exported`-Event aus, damit das
 *  Erinnerungs-Banner sofort reagieren kann. */
export function exportCollectionXml(builds: Build[], groups: BuildGroup[]): void {
  const xml = dataToXml(builds, groups)
  downloadFile('buildplaner-export.xml', xml)
  saveLastExport(computeSignature(xml))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('buildplaner:exported'))
  }
}

/** Löst einen Datei-Download im Browser aus. */
export function downloadFile(
  filename: string,
  content: string,
  mime = 'application/xml',
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
