// Hilfsfunktionen für den Gruppen-Baum (BuildGroup.parentId).

import type { BuildGroup } from './types'

/** Direkte Kind-Gruppen einer Gruppe (parentId === parent). */
export function childrenOf(
  groups: BuildGroup[],
  parentId: string | null,
): BuildGroup[] {
  return groups.filter((g) => g.parentId === parentId)
}

/** Alle Gruppen in Tiefensuch-Reihenfolge mit ihrer Ebene (für eingerückte Listen). */
export function orderedGroups(
  groups: BuildGroup[],
): { group: BuildGroup; depth: number }[] {
  const out: { group: BuildGroup; depth: number }[] = []
  const seen = new Set<string>()
  function walk(parentId: string | null, depth: number) {
    for (const g of groups.filter((x) => x.parentId === parentId)) {
      if (seen.has(g.id)) continue
      seen.add(g.id)
      out.push({ group: g, depth })
      walk(g.id, depth + 1)
    }
  }
  walk(null, 0)
  // Verwaiste Gruppen (parentId zeigt ins Leere) am Ende ergänzen.
  for (const g of groups)
    if (!seen.has(g.id)) {
      seen.add(g.id)
      out.push({ group: g, depth: 0 })
    }
  return out
}
