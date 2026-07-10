// Pre-Renewal Stat-Regeln. Reine Funktionen, damit sie leicht testbar sind.
// Quellen (verifiziert): rAthena db/pre-re/statpoint.yml und iRO/RMS Stat-Tabellen.
//   - Kosten, einen Stat von X auf X+1 zu heben: floor((X-1)/10) + 2
//   - Statuspunkte kumulativ ab Base-Level 1, Zuwachs je Level: floor((Level-1)/5) + 3
//   - Startpunkte bei Level 1: 48 (normal) bzw. 100 (Rebirth/Transcendent)
// Bekannte Prüfwerte: 1->99 kostet 628; Statuspunkte (normal) L1=48, L50=420, L99=1273.

import { STATS, type Stats, type StatKey } from '../types'

export const MIN_STAT = 1
export const MAX_STAT = 99
export const MIN_BASE_LEVEL = 1
export const MAX_BASE_LEVEL = 99

/** Kosten, einen einzelnen Stat von `from` auf `from + 1` zu erhöhen. */
export function statRaiseCost(from: number): number {
  return Math.floor((from - 1) / 10) + 2
}

/** Gesamtkosten, einen Stat von 1 auf `value` zu bringen. */
export function statTotalCost(value: number): number {
  let cost = 0
  for (let x = MIN_STAT; x < value; x++) cost += statRaiseCost(x)
  return cost
}

/** Summe der Statuspunkte, die alle sechs Stats aktuell verbrauchen. */
export function spentStatPoints(stats: Stats): number {
  return STATS.reduce((sum, key) => sum + statTotalCost(stats[key]), 0)
}

/** Insgesamt verfügbare Statuspunkte bei einem gegebenen Base-Level.
 *  Rebirth/Transcendent starten mit 100 statt 48 Punkten; Zuwachs pro Level identisch. */
export function statPointsForLevel(baseLevel: number, isRebirth = false): number {
  const lvl = Math.max(MIN_BASE_LEVEL, Math.min(MAX_BASE_LEVEL, baseLevel))
  let points = isRebirth ? 100 : 48
  for (let l = 2; l <= lvl; l++) points += Math.floor((l - 1) / 5) + 3
  return points
}

/** Kleinstes Base-Level, dessen Statuspunkte für `spent` ausreichen (für „Base-Level aus Stats"). */
export function minLevelForSpent(spent: number, isRebirth = false): number {
  for (let l = MIN_BASE_LEVEL; l <= MAX_BASE_LEVEL; l++) {
    if (statPointsForLevel(l, isRebirth) >= spent) return l
  }
  return MAX_BASE_LEVEL
}

/** Die drei Hexagon-Paare (Charaktererstellung, nur Nicht-Rebirth): je Paar Summe >= 10. */
export const HEXAGON_PAIRS: [StatKey, StatKey][] = [
  ['STR', 'INT'],
  ['AGI', 'LUK'],
  ['VIT', 'DEX'],
]

/** Paare, die die Hexagon-Regel verletzen (Summe < 10). Leer, wenn alles ok. */
export function hexagonViolations(stats: Stats): [StatKey, StatKey][] {
  return HEXAGON_PAIRS.filter(([a, b]) => stats[a] + stats[b] < 10)
}

export interface StatBudget {
  spent: number
  available: number
  remaining: number
  overBudget: boolean
}

export function statBudget(
  stats: Stats,
  baseLevel: number,
  isRebirth = false,
): StatBudget {
  const spent = spentStatPoints(stats)
  const available = statPointsForLevel(baseLevel, isRebirth)
  const remaining = available - spent
  return { spent, available, remaining, overBudget: remaining < 0 }
}
