// Import/Export für calc.arcadia-online.org (Phase 5).
// Reverse-engineert aus dem (unminifizierten) foot_v2025-02-11.js der Seite.
// Format: positionsbasierter Base62-Hash mit fixen Zeichen-Offsets, Version 'k' (=12).
// Voll austauschbar: Klasse + Base-/Job-Level + 6 Stats. Skills: Arcadias kuratierte
// Kampf-Skill-Untermenge je Klasse (m_JobBuff), gemappt auf unsere Skill-IDs.
// Siehe Memory [[arcadia-url-format]].

import type { Build, Stats } from './types'
import { getClass } from './ro/classes'

// --- Base62 mit Arcadias n_NtoS3-Alphabet (Index 0..61) ---
const NS3 = [
  'i', "'", 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', '.', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B',
  'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q',
  'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '-', ':', ';', ',', '=', '$',
  '&', '+',
]
const NS3_INDEX: Record<string, number> = {}
NS3.forEach((ch, i) => (NS3_INDEX[ch] = i))

/** Zahl -> Base62-String fester Breite (1..3 Zeichen), big-endian. */
function ntoS(n: number, width: number): string {
  let v = Math.max(0, Math.floor(n))
  let out = ''
  for (let i = 0; i < width; i++) {
    out = NS3[v % 62] + out
    v = Math.floor(v / 62)
  }
  return out
}

/** Base62-String -> Zahl. Unbekannte Zeichen zählen als 0. */
function stoN(s: string): number {
  let n = 0
  for (const ch of s) n = n * 62 + (NS3_INDEX[ch] ?? 0)
  return n
}

const sub = (s: string, start: number, len: number) => s.slice(start, start + len)

// --- Arcadia-Job-ID (Slot [1]) <-> unsere classId ---
const ARCADIA_JOB_TO_CLASS: Record<number, string | null> = {
  0: 'novice', 1: 'swordsman', 2: 'thief', 3: 'acolyte', 4: 'archer',
  5: 'mage', 6: 'merchant', 7: 'knight', 8: 'assassin', 9: 'priest',
  10: 'hunter', 11: 'wizard', 12: 'blacksmith', 13: 'crusader', 14: 'rogue',
  15: 'monk', 16: 'bard', 17: 'dancer', 18: 'sage', 19: 'alchemist',
  20: 'supernovice', 21: 'lordknight', 22: 'assassincross', 23: 'highpriest',
  24: 'sniper', 25: 'highwizard', 26: 'whitesmith', 27: 'paladin', 28: 'stalker',
  29: 'champion', 30: 'clown', 31: 'gypsy', 32: 'professor', 33: 'creator',
  34: 'highnovice',
  35: null, 36: null, 37: null, 38: null, 39: null, 40: null, // High-First-Jobs: nicht modelliert
  41: 'taekwon', 42: 'stargladiator', 43: 'soullinker', 44: 'ninja', 45: 'gunslinger',
}
const CLASS_TO_ARCADIA: Record<string, number> = {}
for (const [job, cls] of Object.entries(ARCADIA_JOB_TO_CLASS)) {
  if (cls && !(cls in CLASS_TO_ARCADIA)) CLASS_TO_ARCADIA[cls] = Number(job)
}

// --- m_JobBuff: geordnete Arcadia-Skill-Nummern je Job (Position = Skill-Slot im Hash) ---
const M_JOBBUFF: Record<number, number[]> = {
  0: [], 1: [3, 4, 12, 9, 392], 2: [13, 14, 392], 3: [23, 24, 392], // Job 0 (Novice) hat keine Buff-Skills
  4: [38, 39, 42, 392], 5: [58, 392], 6: [68, 392],
  7: [3, 4, 12, 69, 74, 78, 386, 9], 8: [13, 14, 79, 80, 81, 381], 9: [23, 24, 89],
  10: [38, 39, 42, 116, 118, 119, 390], 11: [58],
  12: [68, 146, 148, 150, 152, 154, 155, 389, 311],
  13: [3, 4, 12, 156, 69, 166, 24, 23, 78, 9], 14: [13, 14, 3, 39, 187, 383],
  15: [23, 24, 183, 187, 191, 195, 196, 301], 16: [38, 39, 42, 198],
  17: [38, 39, 42, 206], 18: [58, 224, 228, 229, 234], 19: [68, 241],
  20: [3, 13, 14, 23, 24, 38, 39, 42, 253, 385, 9, 309, 196, 310],
  21: [3, 4, 12, 69, 74, 78, 254, 256, 258, 255, 386, 9],
  22: [13, 14, 79, 80, 81, 262, 266, 381], 23: [23, 24, 89, 269],
  24: [38, 39, 42, 116, 118, 119, 270, 273, 390], 25: [58, 274, 276],
  26: [68, 146, 148, 150, 152, 154, 155, 327, 389, 311],
  27: [3, 4, 12, 156, 69, 166, 24, 23, 78, 9], 28: [13, 14, 3, 39, 286, 287, 187, 383],
  29: [23, 24, 183, 187, 191, 195, 196, 301], 30: [38, 39, 42, 198],
  31: [38, 39, 42, 206], 32: [58, 224, 228, 229, 234, 322, 441], 33: [68, 241],
  34: [0], 35: [392, 3, 4, 12, 9], 36: [392, 13, 14], 37: [392, 23, 24],
  38: [392, 38, 39, 42], 39: [392, 58], 40: [392, 68],
  41: [329, 379, 338, 342, 380, 345, 845],
  42: [329, 379, 338, 342, 380, 352, 353, 354, 355, 356, 357, 367, 361, 364, 365, 846],
  43: [329, 338, 342, 380, 372, 379], 44: [393, 404],
  45: [425, 426, 427, 416, 420, 421, 422, 433],
}

// --- Arcadia-Skill-Nummer -> unsere Skill-ID (nur echte Skills; Pseudo-Einträge fehlen) ---
const ARCADIA_SKILL: Record<number, string> = {
  3: 'SM_SWORD', 4: 'SM_TWOHAND', 9: 'SM_ENDURE', 12: 'SM_AUTOBERSERK',
  13: 'TF_DOUBLE', 14: 'TF_MISS', 23: 'AL_DP', 24: 'AL_DEMONBANE',
  38: 'AC_OWL', 39: 'AC_VULTURE', 42: 'AC_CONCENTRATION', 58: 'MG_ENERGYCOAT',
  68: 'MC_LOUD', 69: 'KN_SPEARMASTERY', 74: 'KN_TWOHANDQUICKEN', 78: 'KN_CAVALIERMASTERY',
  79: 'AS_RIGHT', 80: 'AS_LEFT', 81: 'AS_KATAR', 89: 'PR_MACEMASTERY',
  116: 'HT_BEASTBANE', 118: 'HT_BLITZBEAT', 119: 'HT_STEELCROW',
  146: 'BS_HILTBINDING', 148: 'BS_WEAPONRESEARCH', 150: 'BS_SKINTEMPER',
  152: 'BS_ADRENALINE', 154: 'BS_OVERTHRUST', 155: 'BS_MAXIMIZE',
  156: 'CR_TRUST', 166: 'CR_SPEARQUICKEN', 183: 'MO_IRONHAND', 187: 'MO_TRIPLEATTACK',
  191: 'MO_DODGE', 195: 'MO_EXPLOSIONSPIRITS', 196: 'MO_STEELBODY',
  198: 'BA_MUSICALLESSON', 206: 'DC_DANCINGLESSON', 224: 'SA_ADVANCEDBOOK',
  228: 'SA_FREECAST', 229: 'SA_AUTOSPELL', 234: 'SA_DRAGONOLOGY', 241: 'AM_AXEMASTERY',
  254: 'LK_AURABLADE', 255: 'LK_PARRYING', 256: 'LK_CONCENTRATION', 258: 'LK_BERSERK',
  262: 'ASC_KATAR', 266: 'ASC_EDP', 269: 'HP_MEDITATIO', 273: 'SN_WINDWALK',
  274: 'HW_SOULDRAIN', 276: 'HW_MAGICPOWER', 287: 'ST_REJECTSWORD', 322: 'PF_MEMORIZE',
  327: 'WS_OVERTHRUSTMAX', 329: 'TK_RUN', 338: 'TK_DODGE', 342: 'TK_POWER',
  372: 'SL_KAINA', 381: 'AS_SONICACCEL', 389: 'BS_ADRENALINE2', 393: 'NJ_TOBIDOUGU',
  416: 'GS_GLITTERING', 420: 'GS_MADNESSCANCEL', 421: 'GS_ADJUSTMENT', 422: 'GS_INCREASING',
  425: 'GS_SINGLEACTION', 426: 'GS_SNAKEEYE', 427: 'GS_CHAINACTION', 433: 'GS_GATLINGFEVER',
  845: 'TK_VIRTUES', 846: 'SG_NOVA',
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n) || lo))

export interface ArcadiaData {
  classId: string | null
  baseLevel: number
  jobLevel: number
  stats: Stats
  skills: Record<string, number>
}

/** Dekodiert einen Arcadia-Hash/-Link. Nur die aktuelle Version (Marker 'k'). */
export function decodeArcadia(input: string): ArcadiaData | null {
  const h = input.includes('#') ? input.slice(input.indexOf('#') + 1) : input.trim()
  // Mindestlänge (Kopf bis LUK) + aktueller Versions-Marker.
  if (h.length < 19 || h[0] !== 'k') return null
  const job = stoN(sub(h, 1, 2))
  if (!(job in ARCADIA_JOB_TO_CLASS)) return null
  const classId = ARCADIA_JOB_TO_CLASS[job]
  const maxJob = getClass(classId)?.maxJobLevel ?? 70
  const stats: Stats = {
    STR: clamp(stoN(sub(h, 7, 2)), 1, 99),
    AGI: clamp(stoN(sub(h, 9, 2)), 1, 99),
    VIT: clamp(stoN(sub(h, 11, 2)), 1, 99),
    INT: clamp(stoN(sub(h, 15, 2)), 1, 99),
    DEX: clamp(stoN(sub(h, 13, 2)), 1, 99),
    LUK: clamp(stoN(sub(h, 17, 2)), 1, 99),
  }
  const skills: Record<string, number> = {}
  if (h.length > 89) {
    const count = stoN(sub(h, 88, 1))
    const list = M_JOBBUFF[job] ?? []
    for (let a = 0; a < count && 89 + a < h.length; a++) {
      const lvl = stoN(sub(h, 89 + a, 1))
      const our = ARCADIA_SKILL[list[a]]
      if (lvl > 0 && our) skills[our] = lvl
    }
  }
  return {
    classId,
    baseLevel: clamp(stoN(sub(h, 3, 2)), 1, 99),
    jobLevel: clamp(stoN(sub(h, 5, 2)), 1, maxJob),
    stats,
    skills,
  }
}

/** Baut aus einem Arcadia-Link einen (Inhalts-)Build mit einem Milestone. */
export function decodeArcadiaToBuild(input: string): Build | null {
  const d = decodeArcadia(input)
  if (!d) return null
  const clsName = getClass(d.classId)?.name ?? 'Arcadia'
  return {
    id: '', name: `${clsName} (Arcadia-Import)`, classId: d.classId,
    charLink: '', notes: '', groupIds: [], earlyJobChangeLevel: 50,
    milestones: [{
      id: '', label: 'Import', baseLevel: d.baseLevel, jobLevel: d.jobLevel,
      stats: d.stats, skills: d.skills,
    }],
    createdAt: '', updatedAt: '',
  }
}

/** Erzeugt einen auf calc.arcadia-online.org einlesbaren Link für einen Snapshot.
 *  Gibt null zurück, wenn die Klasse dort nicht existiert. */
export function encodeArcadia(
  classId: string | null,
  baseLevel: number,
  jobLevel: number,
  stats: Stats,
  skills: Record<string, number>,
): string | null {
  if (classId == null || !(classId in CLASS_TO_ARCADIA)) return null
  const job = CLASS_TO_ARCADIA[classId]
  let out = 'k' // Versions-Marker
  out += ntoS(job, 2) + ntoS(baseLevel, 2) + ntoS(jobLevel, 2)
  out += ntoS(stats.STR, 2) + ntoS(stats.AGI, 2) + ntoS(stats.VIT, 2)
  out += ntoS(stats.DEX, 2) + ntoS(stats.INT, 2) + ntoS(stats.LUK, 2)
  out += 'i'.repeat(69) // Ausrüstung (alles 0)
  const list = M_JOBBUFF[job] ?? []
  out += ntoS(list.length, 1)
  for (const arcId of list) {
    const our = ARCADIA_SKILL[arcId]
    out += ntoS(our ? (skills[our] ?? 0) : 0, 1)
  }
  return 'https://calc.arcadia-online.org/#' + out
}
