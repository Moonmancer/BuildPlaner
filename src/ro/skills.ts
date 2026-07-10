// Pre-Renewal Skill-Daten. Struktur (MaxLevel + Voraussetzungen) aus rAthena
// db/pre-re/skill_tree.yml; Anzeigenamen ergänzt. Phase 3c: Novice + First Classes.
// Weitere Klassen (Second/Expanded/Rebirth) folgen in 3d–3g.

import { classChain, getClass } from './classes'
import type { SkillLevels } from '../types'

export interface SkillReq {
  id: string
  level: number
}

export interface SkillDef {
  /** interne Konstante, z.B. 'SM_BASH' (stabile ID) */
  id: string
  /** Anzeigename */
  name: string
  /** Klasse (Registry-ID), zu deren Baum der Skill gehört */
  classId: string
  maxLevel: number
  /** Voraussetzungen (andere Skills + Mindestlevel) */
  requires: SkillReq[]
  /** Ob der Skill an Folgeklassen vererbt wird (Default true). */
  inheritable?: boolean
}

export const SKILLS: SkillDef[] = [
  // ---------- Novice ----------
  { id: 'NV_BASIC', name: 'Basic Skill', classId: 'novice', maxLevel: 9, requires: [] },
  { id: 'NV_FIRSTAID', name: 'First Aid', classId: 'novice', maxLevel: 1, requires: [] },
  { id: 'NV_TRICKDEAD', name: 'Play Dead', classId: 'novice', maxLevel: 1, requires: [], inheritable: false },

  // ---------- Swordman ----------
  { id: 'SM_SWORD', name: 'Sword Mastery', classId: 'swordsman', maxLevel: 10, requires: [] },
  { id: 'SM_TWOHAND', name: 'Two-Handed Sword Mastery', classId: 'swordsman', maxLevel: 10, requires: [{ id: 'SM_SWORD', level: 1 }] },
  { id: 'SM_RECOVERY', name: 'Increase HP Recovery', classId: 'swordsman', maxLevel: 10, requires: [] },
  { id: 'SM_BASH', name: 'Bash', classId: 'swordsman', maxLevel: 10, requires: [] },
  { id: 'SM_PROVOKE', name: 'Provoke', classId: 'swordsman', maxLevel: 10, requires: [] },
  { id: 'SM_MAGNUM', name: 'Magnum Break', classId: 'swordsman', maxLevel: 10, requires: [{ id: 'SM_BASH', level: 5 }] },
  { id: 'SM_ENDURE', name: 'Endure', classId: 'swordsman', maxLevel: 10, requires: [{ id: 'SM_PROVOKE', level: 5 }] },
  { id: 'SM_MOVINGRECOVERY', name: 'HP Recovery While Moving', classId: 'swordsman', maxLevel: 1, requires: [] },
  { id: 'SM_FATALBLOW', name: 'Fatal Blow', classId: 'swordsman', maxLevel: 1, requires: [] },
  { id: 'SM_AUTOBERSERK', name: 'Auto Berserk', classId: 'swordsman', maxLevel: 1, requires: [] },

  // ---------- Mage ----------
  { id: 'MG_SRECOVERY', name: 'Increase SP Recovery', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_SIGHT', name: 'Sight', classId: 'mage', maxLevel: 1, requires: [] },
  { id: 'MG_NAPALMBEAT', name: 'Napalm Beat', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_SOULSTRIKE', name: 'Soul Strike', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_NAPALMBEAT', level: 4 }] },
  { id: 'MG_SAFETYWALL', name: 'Safety Wall', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_NAPALMBEAT', level: 7 }, { id: 'MG_SOULSTRIKE', level: 5 }] },
  { id: 'MG_COLDBOLT', name: 'Cold Bolt', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_FROSTDIVER', name: 'Frost Diver', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_COLDBOLT', level: 5 }] },
  { id: 'MG_STONECURSE', name: 'Stone Curse', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_FIREBOLT', name: 'Fire Bolt', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_FIREBALL', name: 'Fire Ball', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_FIREBOLT', level: 4 }] },
  { id: 'MG_FIREWALL', name: 'Fire Wall', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_FIREBALL', level: 5 }, { id: 'MG_SIGHT', level: 1 }] },
  { id: 'MG_LIGHTNINGBOLT', name: 'Lightning Bolt', classId: 'mage', maxLevel: 10, requires: [] },
  { id: 'MG_THUNDERSTORM', name: 'Thunderstorm', classId: 'mage', maxLevel: 10, requires: [{ id: 'MG_LIGHTNINGBOLT', level: 4 }] },
  { id: 'MG_ENERGYCOAT', name: 'Energy Coat', classId: 'mage', maxLevel: 1, requires: [] },

  // ---------- Archer ----------
  { id: 'AC_OWL', name: "Owl's Eye", classId: 'archer', maxLevel: 10, requires: [] },
  { id: 'AC_VULTURE', name: "Vulture's Eye", classId: 'archer', maxLevel: 10, requires: [{ id: 'AC_OWL', level: 3 }] },
  { id: 'AC_CONCENTRATION', name: 'Improve Concentration', classId: 'archer', maxLevel: 10, requires: [{ id: 'AC_VULTURE', level: 1 }] },
  { id: 'AC_DOUBLE', name: 'Double Strafe', classId: 'archer', maxLevel: 10, requires: [] },
  { id: 'AC_SHOWER', name: 'Arrow Shower', classId: 'archer', maxLevel: 10, requires: [{ id: 'AC_DOUBLE', level: 5 }] },
  { id: 'AC_MAKINGARROW', name: 'Arrow Crafting', classId: 'archer', maxLevel: 1, requires: [] },
  { id: 'AC_CHARGEARROW', name: 'Arrow Repel', classId: 'archer', maxLevel: 1, requires: [] },

  // ---------- Acolyte ----------
  { id: 'AL_DP', name: 'Divine Protection', classId: 'acolyte', maxLevel: 10, requires: [] },
  { id: 'AL_DEMONBANE', name: 'Demon Bane', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_DP', level: 3 }] },
  { id: 'AL_RUWACH', name: 'Ruwach', classId: 'acolyte', maxLevel: 1, requires: [] },
  { id: 'AL_TELEPORT', name: 'Teleport', classId: 'acolyte', maxLevel: 2, requires: [{ id: 'AL_RUWACH', level: 1 }] },
  { id: 'AL_WARP', name: 'Warp Portal', classId: 'acolyte', maxLevel: 4, requires: [{ id: 'AL_TELEPORT', level: 2 }] },
  { id: 'AL_PNEUMA', name: 'Pneuma', classId: 'acolyte', maxLevel: 1, requires: [{ id: 'AL_WARP', level: 4 }] },
  { id: 'AL_HEAL', name: 'Heal', classId: 'acolyte', maxLevel: 10, requires: [] },
  { id: 'AL_INCAGI', name: 'Increase AGI', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_HEAL', level: 3 }] },
  { id: 'AL_DECAGI', name: 'Decrease AGI', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_INCAGI', level: 1 }] },
  { id: 'AL_HOLYWATER', name: 'Aqua Benedicta', classId: 'acolyte', maxLevel: 1, requires: [] },
  { id: 'AL_CRUCIS', name: 'Signum Crucis', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_DEMONBANE', level: 3 }] },
  { id: 'AL_ANGELUS', name: 'Angelus', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_DP', level: 3 }] },
  { id: 'AL_BLESSING', name: 'Blessing', classId: 'acolyte', maxLevel: 10, requires: [{ id: 'AL_DP', level: 5 }] },
  { id: 'AL_CURE', name: 'Cure', classId: 'acolyte', maxLevel: 1, requires: [{ id: 'AL_HEAL', level: 2 }] },
  { id: 'AL_HOLYLIGHT', name: 'Holy Light', classId: 'acolyte', maxLevel: 1, requires: [] },

  // ---------- Merchant ----------
  { id: 'MC_INCCARRY', name: 'Enlarge Weight Limit', classId: 'merchant', maxLevel: 10, requires: [] },
  { id: 'MC_DISCOUNT', name: 'Discount', classId: 'merchant', maxLevel: 10, requires: [{ id: 'MC_INCCARRY', level: 3 }] },
  { id: 'MC_OVERCHARGE', name: 'Overcharge', classId: 'merchant', maxLevel: 10, requires: [{ id: 'MC_DISCOUNT', level: 3 }] },
  { id: 'MC_PUSHCART', name: 'Pushcart', classId: 'merchant', maxLevel: 10, requires: [{ id: 'MC_INCCARRY', level: 5 }] },
  { id: 'MC_IDENTIFY', name: 'Item Appraisal', classId: 'merchant', maxLevel: 1, requires: [] },
  { id: 'MC_VENDING', name: 'Vending', classId: 'merchant', maxLevel: 10, requires: [{ id: 'MC_PUSHCART', level: 3 }] },
  { id: 'MC_MAMMONITE', name: 'Mammonite', classId: 'merchant', maxLevel: 10, requires: [] },
  { id: 'MC_CARTREVOLUTION', name: 'Cart Revolution', classId: 'merchant', maxLevel: 1, requires: [] },
  { id: 'MC_CHANGECART', name: 'Change Cart', classId: 'merchant', maxLevel: 1, requires: [] },
  { id: 'MC_LOUD', name: 'Crazy Uproar', classId: 'merchant', maxLevel: 1, requires: [] },
  { id: 'MC_CARTDECORATE', name: 'Cart Decoration', classId: 'merchant', maxLevel: 1, requires: [] },

  // ---------- Thief ----------
  { id: 'TF_DOUBLE', name: 'Double Attack', classId: 'thief', maxLevel: 10, requires: [] },
  { id: 'TF_MISS', name: 'Improve Dodge', classId: 'thief', maxLevel: 10, requires: [] },
  { id: 'TF_STEAL', name: 'Steal', classId: 'thief', maxLevel: 10, requires: [] },
  { id: 'TF_HIDING', name: 'Hiding', classId: 'thief', maxLevel: 10, requires: [{ id: 'TF_STEAL', level: 5 }] },
  { id: 'TF_POISON', name: 'Envenom', classId: 'thief', maxLevel: 10, requires: [] },
  { id: 'TF_DETOXIFY', name: 'Detoxify', classId: 'thief', maxLevel: 1, requires: [{ id: 'TF_POISON', level: 3 }] },
  { id: 'TF_SPRINKLESAND', name: 'Sprinkle Sand', classId: 'thief', maxLevel: 1, requires: [] },
  { id: 'TF_BACKSLIDING', name: 'Back Slide', classId: 'thief', maxLevel: 1, requires: [] },
  { id: 'TF_PICKSTONE', name: 'Find Stone', classId: 'thief', maxLevel: 1, requires: [] },
  { id: 'TF_THROWSTONE', name: 'Throw Stone', classId: 'thief', maxLevel: 1, requires: [] },
]

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
)

export function getSkill(id: string): SkillDef | undefined {
  return SKILL_BY_ID[id]
}

/** Alle für eine Klasse verfügbaren Skills: eigene + geerbte (via Vererbungskette).
 *  Von Vorgängerklassen werden nur vererbbare Skills übernommen. */
export function skillsForClass(classId: string | null | undefined): SkillDef[] {
  const chain = classChain(classId)
  if (chain.length === 0) return []
  const ownId = chain[chain.length - 1].id
  const chainIds = new Set(chain.map((c) => c.id))
  return SKILLS.filter((s) => {
    if (!chainIds.has(s.classId)) return false
    // geerbte (nicht eigene) nur, wenn vererbbar
    if (s.classId !== ownId && s.inheritable === false) return false
    return true
  })
}

/** Skillpunkt-„Topf" eines Skills: First-Tier (Novice/First-Class) oder Second-Tier
 *  (Second/Transcendent/Expanded). Bestimmt die getrennten Job-Level-Budgets. */
export function skillPool(skill: SkillDef): 'first' | 'second' {
  const tier = getClass(skill.classId)?.tier
  return tier === 'novice' || tier === 'first' ? 'first' : 'second'
}

/** Ob die Voraussetzungen eines Skills bei gegebener Belegung erfüllt sind. */
export function prereqsMet(skill: SkillDef, levels: SkillLevels): boolean {
  return skill.requires.every((r) => (levels[r.id] ?? 0) >= r.level)
}

/** Skills, die diesen Skill als Voraussetzung haben und aktuell noch belegt sind
 *  (für die Prüfung, ob man herunterstufen darf, ohne Abhängige zu brechen). */
export function dependentsBlocking(
  skill: SkillDef,
  targetLevel: number,
  levels: SkillLevels,
  available: SkillDef[],
): SkillDef[] {
  return available.filter((s) =>
    s.requires.some(
      (r) => r.id === skill.id && (levels[s.id] ?? 0) > 0 && targetLevel < r.level,
    ),
  )
}

export interface SkillPoints {
  first: { spent: number; cap: number }
  second: { spent: number; cap: number }
}

/** Verteilte Skillpunkte je Tier + Kapazität (1 Job-Level je Skillpunkt).
 *  First-Cap = bei Second/Transcendent der earlyJobChange-Wert, sonst Max-Joblevel
 *  der First-Class-Ebene (bzw. der Klasse selbst). Second-Cap = Max-Joblevel der Klasse. */
export function skillPoints(
  classId: string | null | undefined,
  levels: SkillLevels,
  earlyJobChangeLevel: number,
): SkillPoints {
  const chain = classChain(classId)
  const cls = chain[chain.length - 1]
  const available = skillsForClass(classId)
  let firstSpent = 0
  let secondSpent = 0
  for (const s of available) {
    const lvl = levels[s.id] ?? 0
    if (lvl <= 0) continue
    if (skillPool(s) === 'first') firstSpent += lvl
    else secondSpent += lvl
  }
  const firstAncestor = chain.find((c) => c.tier === 'first')
  const isAdvanced = cls?.tier === 'second' || cls?.tier === 'transcendent'
  const firstCap = isAdvanced
    ? earlyJobChangeLevel
    : (firstAncestor?.maxJobLevel ?? cls?.maxJobLevel ?? 0)
  const secondCap =
    cls && cls.tier !== 'novice' && cls.tier !== 'first' ? cls.maxJobLevel : 0
  return {
    first: { spent: firstSpent, cap: firstCap },
    second: { spent: secondSpent, cap: secondCap },
  }
}
