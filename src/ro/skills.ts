// Pre-Renewal Skill-Daten, als klassenspezifische Bäume (wie rAthena skill_tree.yml).
// Ein Skill kann in mehreren Klassenbäumen vorkommen (teils mit anderen Voraussetzungen).
// Quelle: rAthena db/pre-re/skill_tree.yml; Anzeigenamen ergänzt. Phase 3c/3d:
// Novice + 6 First Classes + Second-1 (Knight/Priest/Wizard/Hunter/Blacksmith/Assassin).

import { classChain, getClass } from './classes'
import type { SkillLevels } from '../types'

export interface SkillReq {
  id: string
  level: number
}

/** Ein Eintrag im Baum einer Klasse. */
export interface TreeEntry {
  id: string
  name: string
  maxLevel: number
  requires?: SkillReq[]
  /** Platin-/Quest-Skill: per Quest gelernt, kostet keinen Skillpunkt. */
  platinum?: boolean
  /** Wird an Folgeklassen vererbt (Default true). */
  inheritable?: boolean
}

/** Ein aufgelöster Skill für eine konkrete Klasse (Baum-Eintrag + liefernde Klasse). */
export interface SkillDef extends TreeEntry {
  requires: SkillReq[]
  classId: string
}

const R = (id: string, level: number): SkillReq => ({ id, level })

// Pro Klasse nur die EIGENEN Skills (Vererbung wird über die Klassenkette gelöst).
const TREES: Record<string, TreeEntry[]> = {
  novice: [
    { id: 'NV_BASIC', name: 'Basic Skill', maxLevel: 9 },
    { id: 'NV_FIRSTAID', name: 'First Aid', maxLevel: 1, platinum: true },
    { id: 'NV_TRICKDEAD', name: 'Play Dead', maxLevel: 1, platinum: true, inheritable: false },
  ],
  swordsman: [
    { id: 'SM_SWORD', name: 'Sword Mastery', maxLevel: 10 },
    { id: 'SM_TWOHAND', name: 'Two-Handed Sword Mastery', maxLevel: 10, requires: [R('SM_SWORD', 1)] },
    { id: 'SM_RECOVERY', name: 'Increase HP Recovery', maxLevel: 10 },
    { id: 'SM_BASH', name: 'Bash', maxLevel: 10 },
    { id: 'SM_PROVOKE', name: 'Provoke', maxLevel: 10 },
    { id: 'SM_MAGNUM', name: 'Magnum Break', maxLevel: 10, requires: [R('SM_BASH', 5)] },
    { id: 'SM_ENDURE', name: 'Endure', maxLevel: 10, requires: [R('SM_PROVOKE', 5)] },
    { id: 'SM_MOVINGRECOVERY', name: 'HP Recovery While Moving', maxLevel: 1, platinum: true },
    { id: 'SM_FATALBLOW', name: 'Fatal Blow', maxLevel: 1, platinum: true },
    { id: 'SM_AUTOBERSERK', name: 'Auto Berserk', maxLevel: 1, platinum: true },
  ],
  mage: [
    { id: 'MG_SRECOVERY', name: 'Increase SP Recovery', maxLevel: 10 },
    { id: 'MG_SIGHT', name: 'Sight', maxLevel: 1 },
    { id: 'MG_NAPALMBEAT', name: 'Napalm Beat', maxLevel: 10 },
    { id: 'MG_SOULSTRIKE', name: 'Soul Strike', maxLevel: 10, requires: [R('MG_NAPALMBEAT', 4)] },
    { id: 'MG_SAFETYWALL', name: 'Safety Wall', maxLevel: 10, requires: [R('MG_NAPALMBEAT', 7), R('MG_SOULSTRIKE', 5)] },
    { id: 'MG_COLDBOLT', name: 'Cold Bolt', maxLevel: 10 },
    { id: 'MG_FROSTDIVER', name: 'Frost Diver', maxLevel: 10, requires: [R('MG_COLDBOLT', 5)] },
    { id: 'MG_STONECURSE', name: 'Stone Curse', maxLevel: 10 },
    { id: 'MG_FIREBOLT', name: 'Fire Bolt', maxLevel: 10 },
    { id: 'MG_FIREBALL', name: 'Fire Ball', maxLevel: 10, requires: [R('MG_FIREBOLT', 4)] },
    { id: 'MG_FIREWALL', name: 'Fire Wall', maxLevel: 10, requires: [R('MG_FIREBALL', 5), R('MG_SIGHT', 1)] },
    { id: 'MG_LIGHTNINGBOLT', name: 'Lightning Bolt', maxLevel: 10 },
    { id: 'MG_THUNDERSTORM', name: 'Thunderstorm', maxLevel: 10, requires: [R('MG_LIGHTNINGBOLT', 4)] },
    { id: 'MG_ENERGYCOAT', name: 'Energy Coat', maxLevel: 1, platinum: true },
  ],
  archer: [
    { id: 'AC_OWL', name: "Owl's Eye", maxLevel: 10 },
    { id: 'AC_VULTURE', name: "Vulture's Eye", maxLevel: 10, requires: [R('AC_OWL', 3)] },
    { id: 'AC_CONCENTRATION', name: 'Improve Concentration', maxLevel: 10, requires: [R('AC_VULTURE', 1)] },
    { id: 'AC_DOUBLE', name: 'Double Strafe', maxLevel: 10 },
    { id: 'AC_SHOWER', name: 'Arrow Shower', maxLevel: 10, requires: [R('AC_DOUBLE', 5)] },
    { id: 'AC_MAKINGARROW', name: 'Arrow Crafting', maxLevel: 1, platinum: true },
    { id: 'AC_CHARGEARROW', name: 'Arrow Repel', maxLevel: 1, platinum: true },
  ],
  acolyte: [
    { id: 'AL_DP', name: 'Divine Protection', maxLevel: 10 },
    { id: 'AL_DEMONBANE', name: 'Demon Bane', maxLevel: 10, requires: [R('AL_DP', 3)] },
    { id: 'AL_RUWACH', name: 'Ruwach', maxLevel: 1 },
    { id: 'AL_TELEPORT', name: 'Teleport', maxLevel: 2, requires: [R('AL_RUWACH', 1)] },
    { id: 'AL_WARP', name: 'Warp Portal', maxLevel: 4, requires: [R('AL_TELEPORT', 2)] },
    { id: 'AL_PNEUMA', name: 'Pneuma', maxLevel: 1, requires: [R('AL_WARP', 4)] },
    { id: 'AL_HEAL', name: 'Heal', maxLevel: 10 },
    { id: 'AL_INCAGI', name: 'Increase AGI', maxLevel: 10, requires: [R('AL_HEAL', 3)] },
    { id: 'AL_DECAGI', name: 'Decrease AGI', maxLevel: 10, requires: [R('AL_INCAGI', 1)] },
    { id: 'AL_HOLYWATER', name: 'Aqua Benedicta', maxLevel: 1 },
    { id: 'AL_CRUCIS', name: 'Signum Crucis', maxLevel: 10, requires: [R('AL_DEMONBANE', 3)] },
    { id: 'AL_ANGELUS', name: 'Angelus', maxLevel: 10, requires: [R('AL_DP', 3)] },
    { id: 'AL_BLESSING', name: 'Blessing', maxLevel: 10, requires: [R('AL_DP', 5)] },
    { id: 'AL_CURE', name: 'Cure', maxLevel: 1, requires: [R('AL_HEAL', 2)] },
    { id: 'AL_HOLYLIGHT', name: 'Holy Light', maxLevel: 1, platinum: true },
  ],
  merchant: [
    { id: 'MC_INCCARRY', name: 'Enlarge Weight Limit', maxLevel: 10 },
    { id: 'MC_DISCOUNT', name: 'Discount', maxLevel: 10, requires: [R('MC_INCCARRY', 3)] },
    { id: 'MC_OVERCHARGE', name: 'Overcharge', maxLevel: 10, requires: [R('MC_DISCOUNT', 3)] },
    { id: 'MC_PUSHCART', name: 'Pushcart', maxLevel: 10, requires: [R('MC_INCCARRY', 5)] },
    { id: 'MC_IDENTIFY', name: 'Item Appraisal', maxLevel: 1 },
    { id: 'MC_VENDING', name: 'Vending', maxLevel: 10, requires: [R('MC_PUSHCART', 3)] },
    { id: 'MC_MAMMONITE', name: 'Mammonite', maxLevel: 10 },
    { id: 'MC_CARTREVOLUTION', name: 'Cart Revolution', maxLevel: 1, platinum: true },
    { id: 'MC_CHANGECART', name: 'Change Cart', maxLevel: 1, platinum: true },
    { id: 'MC_LOUD', name: 'Crazy Uproar', maxLevel: 1, platinum: true },
    { id: 'MC_CARTDECORATE', name: 'Cart Decoration', maxLevel: 1, platinum: true },
  ],
  thief: [
    { id: 'TF_DOUBLE', name: 'Double Attack', maxLevel: 10 },
    { id: 'TF_MISS', name: 'Improve Dodge', maxLevel: 10 },
    { id: 'TF_STEAL', name: 'Steal', maxLevel: 10 },
    { id: 'TF_HIDING', name: 'Hiding', maxLevel: 10, requires: [R('TF_STEAL', 5)] },
    { id: 'TF_POISON', name: 'Envenom', maxLevel: 10 },
    { id: 'TF_DETOXIFY', name: 'Detoxify', maxLevel: 1, requires: [R('TF_POISON', 3)] },
    { id: 'TF_SPRINKLESAND', name: 'Sprinkle Sand', maxLevel: 1, platinum: true },
    { id: 'TF_BACKSLIDING', name: 'Back Slide', maxLevel: 1, platinum: true },
    { id: 'TF_PICKSTONE', name: 'Find Stone', maxLevel: 1, platinum: true },
    { id: 'TF_THROWSTONE', name: 'Throw Stone', maxLevel: 1, platinum: true },
  ],
  knight: [
    { id: 'KN_SPEARMASTERY', name: 'Spear Mastery', maxLevel: 10 },
    { id: 'KN_PIERCE', name: 'Pierce', maxLevel: 10, requires: [R('KN_SPEARMASTERY', 1)] },
    { id: 'KN_BRANDISHSPEAR', name: 'Brandish Spear', maxLevel: 10, requires: [R('KN_RIDING', 1), R('KN_SPEARSTAB', 3)] },
    { id: 'KN_SPEARSTAB', name: 'Spear Stab', maxLevel: 10, requires: [R('KN_PIERCE', 5)] },
    { id: 'KN_SPEARBOOMERANG', name: 'Spear Boomerang', maxLevel: 5, requires: [R('KN_PIERCE', 3)] },
    { id: 'KN_TWOHANDQUICKEN', name: 'Two-Hand Quicken', maxLevel: 10, requires: [R('SM_TWOHAND', 1)] },
    { id: 'KN_AUTOCOUNTER', name: 'Counter Attack', maxLevel: 5, requires: [R('SM_TWOHAND', 1)] },
    { id: 'KN_BOWLINGBASH', name: 'Bowling Bash', maxLevel: 10, requires: [R('SM_BASH', 10), R('SM_MAGNUM', 3), R('SM_TWOHAND', 5), R('KN_TWOHANDQUICKEN', 10), R('KN_AUTOCOUNTER', 5)] },
    { id: 'KN_RIDING', name: 'Peco Peco Riding', maxLevel: 1, requires: [R('SM_ENDURE', 1)] },
    { id: 'KN_CAVALIERMASTERY', name: 'Cavalier Mastery', maxLevel: 5, requires: [R('KN_RIDING', 1)] },
    { id: 'KN_CHARGEATK', name: 'Charge Attack', maxLevel: 1, platinum: true },
    { id: 'KN_ONEHAND', name: 'One-Hand Quicken', maxLevel: 1, requires: [R('KN_TWOHANDQUICKEN', 10)], platinum: true },
  ],
  priest: [
    { id: 'MG_SRECOVERY', name: 'Increase SP Recovery', maxLevel: 10 },
    { id: 'MG_SAFETYWALL', name: 'Safety Wall', maxLevel: 10, requires: [R('PR_ASPERSIO', 4), R('PR_SANCTUARY', 3)] },
    { id: 'ALL_RESURRECTION', name: 'Resurrection', maxLevel: 4, requires: [R('PR_STRECOVERY', 1), R('MG_SRECOVERY', 4)] },
    { id: 'PR_MACEMASTERY', name: 'Mace Mastery', maxLevel: 10 },
    { id: 'PR_IMPOSITIO', name: 'Impositio Manus', maxLevel: 5 },
    { id: 'PR_SUFFRAGIUM', name: 'Suffragium', maxLevel: 3, requires: [R('PR_IMPOSITIO', 2)] },
    { id: 'PR_ASPERSIO', name: 'Aspersio', maxLevel: 5, requires: [R('AL_HOLYWATER', 1), R('PR_IMPOSITIO', 3)] },
    { id: 'PR_BENEDICTIO', name: 'B.S. Sacramenti', maxLevel: 5, requires: [R('PR_GLORIA', 3), R('PR_ASPERSIO', 5)] },
    { id: 'PR_SANCTUARY', name: 'Sanctuary', maxLevel: 10, requires: [R('AL_HEAL', 1)] },
    { id: 'PR_SLOWPOISON', name: 'Slow Poison', maxLevel: 4 },
    { id: 'PR_STRECOVERY', name: 'Status Recovery', maxLevel: 1 },
    { id: 'PR_KYRIE', name: 'Kyrie Eleison', maxLevel: 10, requires: [R('AL_ANGELUS', 2)] },
    { id: 'PR_MAGNIFICAT', name: 'Magnificat', maxLevel: 5 },
    { id: 'PR_GLORIA', name: 'Gloria', maxLevel: 5, requires: [R('PR_KYRIE', 4), R('PR_MAGNIFICAT', 3)] },
    { id: 'PR_LEXDIVINA', name: 'Lex Divina', maxLevel: 10, requires: [R('AL_RUWACH', 1)] },
    { id: 'PR_TURNUNDEAD', name: 'Turn Undead', maxLevel: 10, requires: [R('ALL_RESURRECTION', 1), R('PR_LEXDIVINA', 3)] },
    { id: 'PR_LEXAETERNA', name: 'Lex Aeterna', maxLevel: 1, requires: [R('PR_LEXDIVINA', 5)] },
    { id: 'PR_MAGNUS', name: 'Magnus Exorcismus', maxLevel: 10, requires: [R('MG_SAFETYWALL', 1), R('PR_LEXAETERNA', 1), R('PR_TURNUNDEAD', 3)] },
    { id: 'PR_REDEMPTIO', name: 'Redemptio', maxLevel: 1, platinum: true },
  ],
  wizard: [
    { id: 'WZ_FIREPILLAR', name: 'Fire Pillar', maxLevel: 10, requires: [R('MG_FIREWALL', 1)] },
    { id: 'WZ_SIGHTRASHER', name: 'Sightrasher', maxLevel: 10, requires: [R('MG_LIGHTNINGBOLT', 1), R('MG_SIGHT', 1)] },
    { id: 'WZ_METEOR', name: 'Meteor Storm', maxLevel: 10, requires: [R('WZ_SIGHTRASHER', 2), R('MG_THUNDERSTORM', 1)] },
    { id: 'WZ_JUPITEL', name: 'Jupitel Thunder', maxLevel: 10, requires: [R('MG_NAPALMBEAT', 1), R('MG_LIGHTNINGBOLT', 1)] },
    { id: 'WZ_VERMILION', name: 'Lord of Vermilion', maxLevel: 10, requires: [R('MG_THUNDERSTORM', 1), R('WZ_JUPITEL', 5)] },
    { id: 'WZ_WATERBALL', name: 'Water Ball', maxLevel: 5, requires: [R('MG_COLDBOLT', 1), R('MG_LIGHTNINGBOLT', 1)] },
    { id: 'WZ_ICEWALL', name: 'Ice Wall', maxLevel: 10, requires: [R('MG_STONECURSE', 1), R('MG_FROSTDIVER', 1)] },
    { id: 'WZ_FROSTNOVA', name: 'Frost Nova', maxLevel: 10, requires: [R('WZ_ICEWALL', 1)] },
    { id: 'WZ_STORMGUST', name: 'Storm Gust', maxLevel: 10, requires: [R('MG_FROSTDIVER', 1), R('WZ_JUPITEL', 3)] },
    { id: 'WZ_EARTHSPIKE', name: 'Earth Spike', maxLevel: 5, requires: [R('MG_STONECURSE', 1)] },
    { id: 'WZ_HEAVENDRIVE', name: "Heaven's Drive", maxLevel: 5, requires: [R('WZ_EARTHSPIKE', 3)] },
    { id: 'WZ_QUAGMIRE', name: 'Quagmire', maxLevel: 5, requires: [R('WZ_HEAVENDRIVE', 1)] },
    { id: 'WZ_ESTIMATION', name: 'Sense', maxLevel: 1, platinum: true },
    { id: 'WZ_SIGHTBLASTER', name: 'Sight Blaster', maxLevel: 1, platinum: true },
  ],
  blacksmith: [
    { id: 'BS_IRON', name: 'Iron Tempering', maxLevel: 5 },
    { id: 'BS_STEEL', name: 'Steel Tempering', maxLevel: 5, requires: [R('BS_IRON', 1)] },
    { id: 'BS_ENCHANTEDSTONE', name: 'Enchantedstone Craft', maxLevel: 5, requires: [R('BS_IRON', 1)] },
    { id: 'BS_ORIDEOCON', name: 'Oridecon Research', maxLevel: 5, requires: [R('BS_ENCHANTEDSTONE', 1)] },
    { id: 'BS_DAGGER', name: 'Smith Dagger', maxLevel: 3 },
    { id: 'BS_SWORD', name: 'Smith Sword', maxLevel: 3, requires: [R('BS_DAGGER', 1)] },
    { id: 'BS_TWOHANDSWORD', name: 'Smith Two-handed Sword', maxLevel: 3, requires: [R('BS_SWORD', 1)] },
    { id: 'BS_AXE', name: 'Smith Axe', maxLevel: 3, requires: [R('BS_SWORD', 2)] },
    { id: 'BS_MACE', name: 'Smith Mace', maxLevel: 3, requires: [R('BS_KNUCKLE', 1)] },
    { id: 'BS_KNUCKLE', name: 'Smith Knucklemace', maxLevel: 3, requires: [R('BS_DAGGER', 1)] },
    { id: 'BS_SPEAR', name: 'Smith Spear', maxLevel: 3, requires: [R('BS_DAGGER', 2)] },
    { id: 'BS_HILTBINDING', name: 'Hilt Binding', maxLevel: 1 },
    { id: 'BS_FINDINGORE', name: 'Ore Discovery', maxLevel: 1, requires: [R('BS_STEEL', 1), R('BS_HILTBINDING', 1)] },
    { id: 'BS_WEAPONRESEARCH', name: 'Weaponry Research', maxLevel: 10, requires: [R('BS_HILTBINDING', 1)] },
    { id: 'BS_REPAIRWEAPON', name: 'Weapon Repair', maxLevel: 1, requires: [R('BS_WEAPONRESEARCH', 1)] },
    { id: 'BS_SKINTEMPER', name: 'Skin Tempering', maxLevel: 5 },
    { id: 'BS_HAMMERFALL', name: 'Hammer Fall', maxLevel: 5 },
    { id: 'BS_ADRENALINE', name: 'Adrenaline Rush', maxLevel: 5, requires: [R('BS_HAMMERFALL', 2)] },
    { id: 'BS_WEAPONPERFECT', name: 'Weapon Perfection', maxLevel: 5, requires: [R('BS_WEAPONRESEARCH', 2), R('BS_ADRENALINE', 2)] },
    { id: 'BS_OVERTHRUST', name: 'Power-Thrust', maxLevel: 5, requires: [R('BS_ADRENALINE', 3)] },
    { id: 'BS_MAXIMIZE', name: 'Maximize Power', maxLevel: 5, requires: [R('BS_WEAPONPERFECT', 3), R('BS_OVERTHRUST', 2)] },
    { id: 'BS_UNFAIRLYTRICK', name: 'Unfair Trick', maxLevel: 1, platinum: true },
    { id: 'BS_GREED', name: 'Greed', maxLevel: 1, platinum: true },
    { id: 'BS_ADRENALINE2', name: 'Advanced Adrenaline Rush', maxLevel: 1, requires: [R('BS_ADRENALINE', 5)], platinum: true },
  ],
  hunter: [
    { id: 'HT_SKIDTRAP', name: 'Skid Trap', maxLevel: 5 },
    { id: 'HT_LANDMINE', name: 'Land Mine', maxLevel: 5 },
    { id: 'HT_ANKLESNARE', name: 'Ankle Snare', maxLevel: 5, requires: [R('HT_SKIDTRAP', 1)] },
    { id: 'HT_SHOCKWAVE', name: 'Shockwave Trap', maxLevel: 5, requires: [R('HT_ANKLESNARE', 1)] },
    { id: 'HT_SANDMAN', name: 'Sandman', maxLevel: 5, requires: [R('HT_FLASHER', 1)] },
    { id: 'HT_FLASHER', name: 'Flasher', maxLevel: 5, requires: [R('HT_SKIDTRAP', 1)] },
    { id: 'HT_FREEZINGTRAP', name: 'Freezing Trap', maxLevel: 5, requires: [R('HT_FLASHER', 1)] },
    { id: 'HT_BLASTMINE', name: 'Blast Mine', maxLevel: 5, requires: [R('HT_LANDMINE', 1), R('HT_SANDMAN', 1), R('HT_FREEZINGTRAP', 1)] },
    { id: 'HT_CLAYMORETRAP', name: 'Claymore Trap', maxLevel: 5, requires: [R('HT_SHOCKWAVE', 1), R('HT_BLASTMINE', 1)] },
    { id: 'HT_REMOVETRAP', name: 'Remove Trap', maxLevel: 1, requires: [R('HT_LANDMINE', 1)] },
    { id: 'HT_TALKIEBOX', name: 'Talkie Box', maxLevel: 1, requires: [R('HT_SHOCKWAVE', 1), R('HT_REMOVETRAP', 1)], platinum: true },
    { id: 'HT_BEASTBANE', name: 'Beast Bane', maxLevel: 10 },
    { id: 'HT_FALCON', name: 'Falconry Mastery', maxLevel: 1, requires: [R('HT_BEASTBANE', 1)] },
    { id: 'HT_BLITZBEAT', name: 'Blitz Beat', maxLevel: 5, requires: [R('HT_FALCON', 1)] },
    { id: 'HT_STEELCROW', name: 'Steel Crow', maxLevel: 10, requires: [R('HT_BLITZBEAT', 5)] },
    { id: 'HT_DETECTING', name: 'Detect', maxLevel: 4, requires: [R('AC_CONCENTRATION', 1), R('HT_FALCON', 1)] },
    { id: 'HT_SPRINGTRAP', name: 'Spring Trap', maxLevel: 5, requires: [R('HT_REMOVETRAP', 1), R('HT_FALCON', 1)] },
    { id: 'HT_PHANTASMIC', name: 'Phantasmic Arrow', maxLevel: 1, platinum: true },
    { id: 'HT_POWER', name: 'Beast Strafing', maxLevel: 1, requires: [R('AC_DOUBLE', 10)], platinum: true },
  ],
  assassin: [
    { id: 'AS_RIGHT', name: 'Righthand Mastery', maxLevel: 5 },
    { id: 'AS_LEFT', name: 'Lefthand Mastery', maxLevel: 5, requires: [R('AS_RIGHT', 2)] },
    { id: 'AS_KATAR', name: 'Katar Mastery', maxLevel: 10 },
    { id: 'AS_CLOAKING', name: 'Cloaking', maxLevel: 10, requires: [R('TF_HIDING', 2)] },
    { id: 'AS_SONICBLOW', name: 'Sonic Blow', maxLevel: 10, requires: [R('AS_KATAR', 4)] },
    { id: 'AS_GRIMTOOTH', name: 'Grimtooth', maxLevel: 5, requires: [R('AS_CLOAKING', 2), R('AS_SONICBLOW', 5)] },
    { id: 'AS_ENCHANTPOISON', name: 'Enchant Poison', maxLevel: 10, requires: [R('TF_POISON', 1)] },
    { id: 'AS_POISONREACT', name: 'Poison React', maxLevel: 10, requires: [R('AS_ENCHANTPOISON', 3)] },
    { id: 'AS_VENOMDUST', name: 'Venom Dust', maxLevel: 10, requires: [R('AS_ENCHANTPOISON', 5)] },
    { id: 'AS_SPLASHER', name: 'Venom Splasher', maxLevel: 10, requires: [R('AS_POISONREACT', 5), R('AS_VENOMDUST', 5)] },
    { id: 'AS_SONICACCEL', name: 'Sonic Acceleration', maxLevel: 1, platinum: true },
    { id: 'AS_VENOMKNIFE', name: 'Throw Venom Knife', maxLevel: 1, platinum: true },
  ],
}

// Anzeigenamen global (id -> Name, erstes Vorkommen) für Nachschlagen.
const SKILL_NAMES: Record<string, string> = {}
const PLATINUM = new Set<string>()
for (const entries of Object.values(TREES)) {
  for (const e of entries) {
    if (!(e.id in SKILL_NAMES)) SKILL_NAMES[e.id] = e.name
    if (e.platinum) PLATINUM.add(e.id)
  }
}

export function skillName(id: string): string {
  return SKILL_NAMES[id] ?? id
}

/** Ob ein Skill ein Platin-/Quest-Skill ist (kostet keinen Skillpunkt). */
export function isPlatinum(id: string): boolean {
  return PLATINUM.has(id)
}

/** Alle für eine Klasse verfügbaren Skills: eigener Baum + geerbte Bäume der
 *  Vorgängerklassen (Vererbungskette). Von Vorgängern nur vererbbare Skills.
 *  Jeder Skill trägt die liefernde Klasse (classId) für Pool-/Anzeige-Zwecke. */
export function skillsForClass(classId: string | null | undefined): SkillDef[] {
  const chain = classChain(classId)
  if (chain.length === 0) return []
  const ownId = chain[chain.length - 1].id
  const out: SkillDef[] = []
  const seen = new Set<string>()
  // von der Klasse selbst zur Wurzel, damit eigene Einträge Vorrang haben
  for (let i = chain.length - 1; i >= 0; i--) {
    const c = chain[i]
    for (const e of TREES[c.id] ?? []) {
      if (seen.has(e.id)) continue
      if (c.id !== ownId && e.inheritable === false) continue
      seen.add(e.id)
      out.push({ ...e, requires: e.requires ?? [], classId: c.id })
    }
  }
  return out
}

export type SkillPool = 'novice' | 'first' | 'second'

/** Skillpunkt-„Topf" eines Skills anhand der liefernden Klasse. Novice ist eigener Topf. */
export function skillPool(skill: SkillDef): SkillPool {
  const tier = getClass(skill.classId)?.tier
  if (tier === 'novice') return 'novice'
  if (tier === 'first') return 'first'
  return 'second'
}

/** Lernt einen Skill auf `targetLevel` und lernt benötigte Vor-Skills rekursiv mit.
 *  Voraussetzungen/Max-Level werden aus der verfügbaren Skill-Liste aufgelöst. */
export function learnSkill(
  levels: SkillLevels,
  skillId: string,
  targetLevel: number,
  available: SkillDef[],
): SkillLevels {
  const byId = new Map(available.map((s) => [s.id, s]))
  const next: SkillLevels = { ...levels }
  const seen = new Set<string>()
  function ensure(id: string, lvl: number) {
    const s = byId.get(id)
    if (!s) return
    next[id] = Math.max(next[id] ?? 0, Math.min(lvl, s.maxLevel))
    if (seen.has(id)) return
    seen.add(id)
    for (const r of s.requires) ensure(r.id, r.level)
  }
  ensure(skillId, targetLevel)
  return next
}

/** Skills, die `skill` als Voraussetzung haben und bei `targetLevel` brechen würden. */
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

export interface PoolInfo {
  spent: number
  cap: number
}
export interface SkillPoints {
  novice: PoolInfo
  first: PoolInfo
  second: PoolInfo
}

/** Verteilte Skillpunkte je Tier + Kapazität (1 Job-Level je Skillpunkt).
 *  Platin-/Quest-Skills zählen nicht. Novice = eigener Topf. */
export function skillPoints(
  classId: string | null | undefined,
  levels: SkillLevels,
  earlyJobChangeLevel: number,
): SkillPoints {
  const chain = classChain(classId)
  const cls = chain[chain.length - 1]
  const available = skillsForClass(classId)
  let noviceSpent = 0
  let firstSpent = 0
  let secondSpent = 0
  for (const s of available) {
    const lvl = levels[s.id] ?? 0
    if (lvl <= 0 || isPlatinum(s.id)) continue
    const pool = skillPool(s)
    if (pool === 'novice') noviceSpent += lvl
    else if (pool === 'first') firstSpent += lvl
    else secondSpent += lvl
  }
  const noviceClass = chain.find((c) => c.tier === 'novice')
  const firstAncestor = chain.find((c) => c.tier === 'first')
  const isAdvanced = cls?.tier === 'second' || cls?.tier === 'transcendent'
  const firstCap = isAdvanced
    ? earlyJobChangeLevel
    : (firstAncestor?.maxJobLevel ?? 0)
  const secondCap =
    cls && cls.tier !== 'novice' && cls.tier !== 'first' ? cls.maxJobLevel : 0
  return {
    novice: { spent: noviceSpent, cap: noviceClass?.maxJobLevel ?? 0 },
    first: { spent: firstSpent, cap: firstCap },
    second: { spent: secondSpent, cap: secondCap },
  }
}
