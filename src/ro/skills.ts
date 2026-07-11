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
  crusader: [
    { id: 'KN_RIDING', name: 'Peco Peco Riding', maxLevel: 1, requires: [R('SM_ENDURE', 1)] },
    { id: 'KN_CAVALIERMASTERY', name: 'Cavalier Mastery', maxLevel: 5, requires: [R('KN_RIDING', 1)] },
    { id: 'KN_SPEARMASTERY', name: 'Spear Mastery', maxLevel: 10 },
    { id: 'CR_TRUST', name: 'Faith', maxLevel: 10 },
    { id: 'AL_CURE', name: 'Cure', maxLevel: 1, requires: [R('CR_TRUST', 5)] },
    { id: 'AL_DP', name: 'Divine Protection', maxLevel: 10, requires: [R('AL_CURE', 1)] },
    { id: 'AL_DEMONBANE', name: 'Demon Bane', maxLevel: 10, requires: [R('AL_DP', 3)] },
    { id: 'AL_HEAL', name: 'Heal', maxLevel: 10, requires: [R('AL_DEMONBANE', 5), R('CR_TRUST', 10)] },
    { id: 'CR_AUTOGUARD', name: 'Guard', maxLevel: 10 },
    { id: 'CR_SHIELDCHARGE', name: 'Smite', maxLevel: 5, requires: [R('CR_AUTOGUARD', 5)] },
    { id: 'CR_SHIELDBOOMERANG', name: 'Shield Boomerang', maxLevel: 5, requires: [R('CR_SHIELDCHARGE', 3)] },
    { id: 'CR_REFLECTSHIELD', name: 'Reflect Shield', maxLevel: 10, requires: [R('CR_SHIELDBOOMERANG', 3)] },
    { id: 'CR_HOLYCROSS', name: 'Holy Cross', maxLevel: 10, requires: [R('CR_TRUST', 7)] },
    { id: 'CR_GRANDCROSS', name: 'Grand Cross', maxLevel: 10, requires: [R('CR_HOLYCROSS', 6), R('CR_TRUST', 10)] },
    { id: 'CR_DEVOTION', name: 'Devotion', maxLevel: 5, requires: [R('CR_REFLECTSHIELD', 5), R('CR_GRANDCROSS', 4)] },
    { id: 'CR_PROVIDENCE', name: 'Resistant Souls', maxLevel: 5, requires: [R('AL_DP', 5), R('AL_HEAL', 5)] },
    { id: 'CR_DEFENDER', name: 'Defender', maxLevel: 5, requires: [R('CR_SHIELDBOOMERANG', 1)] },
    { id: 'CR_SPEARQUICKEN', name: 'Spear Quicken', maxLevel: 10, requires: [R('KN_SPEARMASTERY', 10)] },
    { id: 'CR_SHRINK', name: 'Shrink', maxLevel: 1, platinum: true },
  ],
  monk: [
    { id: 'MO_IRONHAND', name: 'Iron Fists', maxLevel: 10, requires: [R('AL_DEMONBANE', 10), R('AL_DP', 10)] },
    { id: 'MO_CALLSPIRITS', name: 'Summon Spirit Sphere', maxLevel: 5, requires: [R('MO_IRONHAND', 2)] },
    { id: 'MO_ABSORBSPIRITS', name: 'Absorb Spirit Sphere', maxLevel: 1, requires: [R('MO_CALLSPIRITS', 5)] },
    { id: 'MO_DODGE', name: 'Dodge', maxLevel: 10, requires: [R('MO_IRONHAND', 5), R('MO_CALLSPIRITS', 5)] },
    { id: 'MO_BLADESTOP', name: 'Root', maxLevel: 5, requires: [R('MO_DODGE', 5)] },
    { id: 'MO_SPIRITSRECOVERY', name: 'Spiritual Cadence', maxLevel: 5, requires: [R('MO_BLADESTOP', 2)] },
    { id: 'MO_TRIPLEATTACK', name: 'Raging Trifecta Blow', maxLevel: 10, requires: [R('MO_DODGE', 5)] },
    { id: 'MO_CHAINCOMBO', name: 'Raging Quadruple Blow', maxLevel: 5, requires: [R('MO_TRIPLEATTACK', 5)] },
    { id: 'MO_COMBOFINISH', name: 'Raging Thrust', maxLevel: 5, requires: [R('MO_CHAINCOMBO', 3)] },
    { id: 'MO_STEELBODY', name: 'Steel Body', maxLevel: 5, requires: [R('MO_COMBOFINISH', 3)] },
    { id: 'MO_INVESTIGATE', name: 'Occult Impaction', maxLevel: 5, requires: [R('MO_CALLSPIRITS', 5)] },
    { id: 'MO_FINGEROFFENSIVE', name: 'Throw Spirit Sphere', maxLevel: 5, requires: [R('MO_INVESTIGATE', 3)] },
    { id: 'MO_EXPLOSIONSPIRITS', name: 'Fury', maxLevel: 5, requires: [R('MO_ABSORBSPIRITS', 1)] },
    { id: 'MO_EXTREMITYFIST', name: 'Asura Strike', maxLevel: 5, requires: [R('MO_EXPLOSIONSPIRITS', 3), R('MO_FINGEROFFENSIVE', 3)] },
    { id: 'MO_BODYRELOCATION', name: 'Snap', maxLevel: 1, requires: [R('MO_EXTREMITYFIST', 3), R('MO_SPIRITSRECOVERY', 2), R('MO_STEELBODY', 3)] },
    { id: 'MO_KITRANSLATION', name: 'Ki Translation', maxLevel: 1, platinum: true },
    { id: 'MO_BALKYOUNG', name: 'Ki Explosion', maxLevel: 1, platinum: true },
  ],
  sage: [
    { id: 'WZ_ESTIMATION', name: 'Sense', maxLevel: 1, platinum: true },
    { id: 'SA_ADVANCEDBOOK', name: 'Study', maxLevel: 10 },
    { id: 'SA_CASTCANCEL', name: 'Cast Cancel', maxLevel: 5, requires: [R('SA_ADVANCEDBOOK', 2)] },
    { id: 'SA_MAGICROD', name: 'Magic Rod', maxLevel: 5, requires: [R('SA_ADVANCEDBOOK', 4)] },
    { id: 'SA_SPELLBREAKER', name: 'Spell Breaker', maxLevel: 5, requires: [R('SA_MAGICROD', 1)] },
    { id: 'SA_FREECAST', name: 'Free Cast', maxLevel: 10, requires: [R('SA_CASTCANCEL', 1)] },
    { id: 'SA_AUTOSPELL', name: 'Hindsight', maxLevel: 10, requires: [R('SA_FREECAST', 4)] },
    { id: 'SA_FLAMELAUNCHER', name: 'Flame Launcher', maxLevel: 5, requires: [R('MG_FIREBOLT', 1), R('SA_ADVANCEDBOOK', 5)] },
    { id: 'SA_FROSTWEAPON', name: 'Frost Weapon', maxLevel: 5, requires: [R('MG_COLDBOLT', 1), R('SA_ADVANCEDBOOK', 5)] },
    { id: 'SA_LIGHTNINGLOADER', name: 'Lightning Loader', maxLevel: 5, requires: [R('MG_LIGHTNINGBOLT', 1), R('SA_ADVANCEDBOOK', 5)] },
    { id: 'SA_SEISMICWEAPON', name: 'Seismic Weapon', maxLevel: 5, requires: [R('MG_STONECURSE', 1), R('SA_ADVANCEDBOOK', 5)] },
    { id: 'WZ_EARTHSPIKE', name: 'Earth Spike', maxLevel: 5, requires: [R('SA_SEISMICWEAPON', 1)] },
    { id: 'WZ_HEAVENDRIVE', name: "Heaven's Drive", maxLevel: 5, requires: [R('WZ_EARTHSPIKE', 1)] },
    { id: 'SA_DRAGONOLOGY', name: 'Dragonology', maxLevel: 5, requires: [R('SA_ADVANCEDBOOK', 9)] },
    { id: 'SA_VOLCANO', name: 'Volcano', maxLevel: 5, requires: [R('SA_FLAMELAUNCHER', 2)] },
    { id: 'SA_DELUGE', name: 'Deluge', maxLevel: 5, requires: [R('SA_FROSTWEAPON', 2)] },
    { id: 'SA_VIOLENTGALE', name: 'Violent Gale', maxLevel: 5, requires: [R('SA_LIGHTNINGLOADER', 2)] },
    { id: 'SA_LANDPROTECTOR', name: 'Land Protector', maxLevel: 5, requires: [R('SA_VOLCANO', 3), R('SA_DELUGE', 3), R('SA_VIOLENTGALE', 3)] },
    { id: 'SA_DISPELL', name: 'Dispell', maxLevel: 5, requires: [R('SA_SPELLBREAKER', 3)] },
    { id: 'SA_ABRACADABRA', name: 'Hocus-Pocus', maxLevel: 10, requires: [R('SA_AUTOSPELL', 5), R('SA_DISPELL', 1), R('SA_LANDPROTECTOR', 1)] },
    { id: 'SA_CREATECON', name: 'Create Elemental Converter', maxLevel: 1, platinum: true },
    { id: 'SA_ELEMENTWATER', name: 'Elemental Change (Water)', maxLevel: 1, platinum: true },
    { id: 'SA_ELEMENTGROUND', name: 'Elemental Change (Earth)', maxLevel: 1, platinum: true },
    { id: 'SA_ELEMENTFIRE', name: 'Elemental Change (Fire)', maxLevel: 1, platinum: true },
    { id: 'SA_ELEMENTWIND', name: 'Elemental Change (Wind)', maxLevel: 1, platinum: true },
  ],
  rogue: [
    { id: 'SM_SWORD', name: 'Sword Mastery', maxLevel: 10 },
    { id: 'AC_VULTURE', name: "Vulture's Eye", maxLevel: 10 },
    { id: 'AC_DOUBLE', name: 'Double Strafe', maxLevel: 10, requires: [R('AC_VULTURE', 10)] },
    { id: 'HT_REMOVETRAP', name: 'Remove Trap', maxLevel: 1, requires: [R('AC_DOUBLE', 5)] },
    { id: 'RG_SNATCHER', name: 'Snatcher', maxLevel: 10, requires: [R('TF_STEAL', 1)] },
    { id: 'RG_STEALCOIN', name: 'Mug', maxLevel: 10, requires: [R('RG_SNATCHER', 4)] },
    { id: 'RG_BACKSTAP', name: 'Back Stab', maxLevel: 10, requires: [R('RG_STEALCOIN', 4)] },
    { id: 'RG_TUNNELDRIVE', name: 'Stalk', maxLevel: 5, requires: [R('TF_HIDING', 1)] },
    { id: 'RG_RAID', name: 'Sightless Mind', maxLevel: 5, requires: [R('RG_BACKSTAP', 2), R('RG_TUNNELDRIVE', 2)] },
    { id: 'RG_STRIPHELM', name: 'Divest Helm', maxLevel: 5, requires: [R('RG_STEALCOIN', 2)] },
    { id: 'RG_STRIPSHIELD', name: 'Divest Shield', maxLevel: 5, requires: [R('RG_STRIPHELM', 5)] },
    { id: 'RG_STRIPARMOR', name: 'Divest Armor', maxLevel: 5, requires: [R('RG_STRIPSHIELD', 5)] },
    { id: 'RG_STRIPWEAPON', name: 'Divest Weapon', maxLevel: 5, requires: [R('RG_STRIPARMOR', 5)] },
    { id: 'RG_INTIMIDATE', name: 'Snatch', maxLevel: 5, requires: [R('RG_BACKSTAP', 4), R('RG_RAID', 5)] },
    { id: 'RG_PLAGIARISM', name: 'Plagiarism', maxLevel: 10, requires: [R('RG_INTIMIDATE', 5)] },
    { id: 'RG_GANGSTER', name: "Gangster's Paradise", maxLevel: 1, requires: [R('RG_STRIPSHIELD', 3)], platinum: true },
    { id: 'RG_COMPULSION', name: 'Haggle', maxLevel: 5, requires: [R('RG_GANGSTER', 1)], platinum: true },
    { id: 'RG_CLEANER', name: 'Remover', maxLevel: 1, requires: [R('RG_GANGSTER', 1)], platinum: true },
    { id: 'RG_FLAGGRAFFITI', name: 'Piece', maxLevel: 5, requires: [R('RG_CLEANER', 1)], platinum: true },
    { id: 'RG_GRAFFITI', name: 'Scribble', maxLevel: 1, requires: [R('RG_FLAGGRAFFITI', 5)], platinum: true },
    { id: 'RG_CLOSECONFINE', name: 'Close Confine', maxLevel: 1, platinum: true },
  ],
  alchemist: [
    { id: 'AM_AXEMASTERY', name: 'Axe Mastery', maxLevel: 10 },
    { id: 'AM_LEARNINGPOTION', name: 'Potion Research', maxLevel: 10 },
    { id: 'AM_PHARMACY', name: 'Prepare Potion', maxLevel: 10, requires: [R('AM_LEARNINGPOTION', 5)] },
    { id: 'AM_SPHEREMINE', name: 'Summon Marine Sphere', maxLevel: 5, requires: [R('AM_PHARMACY', 2)] },
    { id: 'AM_POTIONPITCHER', name: 'Aid Potion', maxLevel: 5, requires: [R('AM_PHARMACY', 3)] },
    { id: 'AM_DEMONSTRATION', name: 'Bomb', maxLevel: 5, requires: [R('AM_PHARMACY', 4)] },
    { id: 'AM_ACIDTERROR', name: 'Acid Terror', maxLevel: 5, requires: [R('AM_PHARMACY', 5)] },
    { id: 'AM_CANNIBALIZE', name: 'Summon Flora', maxLevel: 5, requires: [R('AM_PHARMACY', 6)] },
    { id: 'AM_CP_HELM', name: 'Chemical Protection Helm', maxLevel: 5, requires: [R('AM_PHARMACY', 2)] },
    { id: 'AM_CP_ARMOR', name: 'Chemical Protection Armor', maxLevel: 5, requires: [R('AM_CP_SHIELD', 3)] },
    { id: 'AM_CP_SHIELD', name: 'Chemical Protection Shield', maxLevel: 5, requires: [R('AM_CP_HELM', 3)] },
    { id: 'AM_CP_WEAPON', name: 'Chemical Protection Weapon', maxLevel: 5, requires: [R('AM_CP_ARMOR', 3)] },
    { id: 'AM_BIOETHICS', name: 'Bioethics', maxLevel: 1, platinum: true },
    { id: 'AM_REST', name: 'Vaporize', maxLevel: 1, requires: [R('AM_BIOETHICS', 1)] },
    { id: 'AM_CALLHOMUN', name: 'Call Homunculus', maxLevel: 1, requires: [R('AM_REST', 1)] },
    { id: 'AM_RESURRECTHOMUN', name: 'Resurrect Homunculus', maxLevel: 5, requires: [R('AM_CALLHOMUN', 1)] },
    { id: 'AM_BERSERKPITCHER', name: 'Berserk Pitcher', maxLevel: 1, platinum: true },
    { id: 'AM_TWILIGHT1', name: 'Twilight Alchemy 1', maxLevel: 1, requires: [R('AM_PHARMACY', 10)], platinum: true },
    { id: 'AM_TWILIGHT2', name: 'Twilight Alchemy 2', maxLevel: 1, requires: [R('AM_PHARMACY', 10)], platinum: true },
    { id: 'AM_TWILIGHT3', name: 'Twilight Alchemy 3', maxLevel: 1, requires: [R('AM_PHARMACY', 10)], platinum: true },
  ],
  bard: [
    { id: 'BA_MUSICALLESSON', name: 'Musical Lesson', maxLevel: 10 },
    { id: 'BA_MUSICALSTRIKE', name: 'Melody Strike', maxLevel: 5, requires: [R('BA_MUSICALLESSON', 3)] },
    { id: 'BD_ADAPTATION', name: 'Amp', maxLevel: 1 },
    { id: 'BD_ENCORE', name: 'Encore', maxLevel: 1, requires: [R('BD_ADAPTATION', 1)] },
    { id: 'BA_DISSONANCE', name: 'Dissonance', maxLevel: 5, requires: [R('BA_MUSICALLESSON', 1), R('BD_ADAPTATION', 1)] },
    { id: 'BA_FROSTJOKER', name: 'Unbarring Octave', maxLevel: 5, requires: [R('BD_ENCORE', 1)] },
    { id: 'BA_WHISTLE', name: 'Perfect Tablature', maxLevel: 10, requires: [R('BA_DISSONANCE', 3)] },
    { id: 'BA_ASSASSINCROSS', name: 'Impressive Riff', maxLevel: 10, requires: [R('BA_DISSONANCE', 3)] },
    { id: 'BA_POEMBRAGI', name: 'Magic Strings', maxLevel: 10, requires: [R('BA_DISSONANCE', 3)] },
    { id: 'BA_APPLEIDUN', name: 'Song of Lutie', maxLevel: 10, requires: [R('BA_DISSONANCE', 3)] },
    { id: 'BD_LULLABY', name: 'Lullaby', maxLevel: 1, requires: [R('BA_WHISTLE', 10)] },
    { id: 'BD_ROKISWEIL', name: "Loki's Veil", maxLevel: 1, requires: [R('BA_ASSASSINCROSS', 10)] },
    { id: 'BD_SIEGFRIED', name: 'Invulnerable Siegfried', maxLevel: 5, requires: [R('BA_POEMBRAGI', 10)] },
    { id: 'BD_DRUMBATTLEFIELD', name: 'Drum on the Battlefield', maxLevel: 5, requires: [R('BA_APPLEIDUN', 10)] },
    { id: 'BD_RICHMANKIM', name: 'Mr. Kim a Rich Man', maxLevel: 5, requires: [R('BD_SIEGFRIED', 3)] },
    { id: 'BD_ETERNALCHAOS', name: 'Eternal Chaos', maxLevel: 1, requires: [R('BD_ROKISWEIL', 1)] },
    { id: 'BD_RINGNIBELUNGEN', name: 'Ring of Nibelungen', maxLevel: 5, requires: [R('BD_DRUMBATTLEFIELD', 3)] },
    { id: 'BD_INTOABYSS', name: 'Into the Abyss', maxLevel: 1, requires: [R('BD_LULLABY', 1)] },
    { id: 'BA_PANGVOICE', name: 'Pang Voice', maxLevel: 1, platinum: true },
  ],
  dancer: [
    { id: 'DC_DANCINGLESSON', name: 'Dancing Lesson', maxLevel: 10 },
    { id: 'DC_THROWARROW', name: 'Slinging Arrow', maxLevel: 5, requires: [R('DC_DANCINGLESSON', 3)] },
    { id: 'BD_ADAPTATION', name: 'Amp', maxLevel: 1 },
    { id: 'BD_ENCORE', name: 'Encore', maxLevel: 1, requires: [R('BD_ADAPTATION', 1)] },
    { id: 'DC_UGLYDANCE', name: 'Hip Shaker', maxLevel: 5, requires: [R('DC_DANCINGLESSON', 1), R('BD_ADAPTATION', 1)] },
    { id: 'DC_SCREAM', name: 'Dazzler', maxLevel: 5, requires: [R('BD_ENCORE', 1)] },
    { id: 'DC_HUMMING', name: 'Focus Ballet', maxLevel: 10, requires: [R('DC_UGLYDANCE', 3)] },
    { id: 'DC_DONTFORGETME', name: 'Slow Grace', maxLevel: 10, requires: [R('DC_UGLYDANCE', 3)] },
    { id: 'DC_FORTUNEKISS', name: "Lady Luck", maxLevel: 10, requires: [R('DC_UGLYDANCE', 3)] },
    { id: 'DC_SERVICEFORYOU', name: "Gypsy's Kiss", maxLevel: 10, requires: [R('DC_UGLYDANCE', 3)] },
    { id: 'BD_LULLABY', name: 'Lullaby', maxLevel: 1, requires: [R('DC_HUMMING', 10)] },
    { id: 'BD_ROKISWEIL', name: "Loki's Veil", maxLevel: 1, requires: [R('DC_DONTFORGETME', 10)] },
    { id: 'BD_SIEGFRIED', name: 'Invulnerable Siegfried', maxLevel: 5, requires: [R('DC_FORTUNEKISS', 10)] },
    { id: 'BD_DRUMBATTLEFIELD', name: 'Drum on the Battlefield', maxLevel: 5, requires: [R('DC_SERVICEFORYOU', 10)] },
    { id: 'BD_RICHMANKIM', name: 'Mr. Kim a Rich Man', maxLevel: 5, requires: [R('BD_SIEGFRIED', 3)] },
    { id: 'BD_ETERNALCHAOS', name: 'Eternal Chaos', maxLevel: 1, requires: [R('BD_ROKISWEIL', 1)] },
    { id: 'BD_RINGNIBELUNGEN', name: 'Ring of Nibelungen', maxLevel: 5, requires: [R('BD_DRUMBATTLEFIELD', 3)] },
    { id: 'BD_INTOABYSS', name: 'Into the Abyss', maxLevel: 1, requires: [R('BD_LULLABY', 1)] },
    { id: 'DC_WINKCHARM', name: 'Wink of Charm', maxLevel: 1, platinum: true },
  ],
  supernovice: [
    { id: 'SM_SWORD', name: 'Sword Mastery', maxLevel: 10 },
    { id: 'SM_RECOVERY', name: 'Increase HP Recovery', maxLevel: 10 },
    { id: 'SM_BASH', name: 'Bash', maxLevel: 10 },
    { id: 'SM_PROVOKE', name: 'Provoke', maxLevel: 10 },
    { id: 'SM_MAGNUM', name: 'Magnum Break', maxLevel: 10, requires: [R('SM_BASH', 5)] },
    { id: 'SM_ENDURE', name: 'Endure', maxLevel: 10, requires: [R('SM_PROVOKE', 5)] },
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
    { id: 'MC_INCCARRY', name: 'Enlarge Weight Limit', maxLevel: 10 },
    { id: 'MC_DISCOUNT', name: 'Discount', maxLevel: 10, requires: [R('MC_INCCARRY', 3)] },
    { id: 'MC_OVERCHARGE', name: 'Overcharge', maxLevel: 10, requires: [R('MC_DISCOUNT', 3)] },
    { id: 'MC_PUSHCART', name: 'Pushcart', maxLevel: 10, requires: [R('MC_INCCARRY', 5)] },
    { id: 'MC_IDENTIFY', name: 'Item Appraisal', maxLevel: 1 },
    { id: 'MC_VENDING', name: 'Vending', maxLevel: 10, requires: [R('MC_PUSHCART', 3)] },
    { id: 'MC_MAMMONITE', name: 'Mammonite', maxLevel: 10 },
    { id: 'AC_OWL', name: "Owl's Eye", maxLevel: 10 },
    { id: 'AC_VULTURE', name: "Vulture's Eye", maxLevel: 10, requires: [R('AC_OWL', 3)] },
    { id: 'AC_CONCENTRATION', name: 'Improve Concentration', maxLevel: 10, requires: [R('AC_VULTURE', 1)] },
    { id: 'TF_DOUBLE', name: 'Double Attack', maxLevel: 10 },
    { id: 'TF_MISS', name: 'Improve Dodge', maxLevel: 10 },
    { id: 'TF_STEAL', name: 'Steal', maxLevel: 10 },
    { id: 'TF_HIDING', name: 'Hiding', maxLevel: 10, requires: [R('TF_STEAL', 5)] },
    { id: 'TF_POISON', name: 'Envenom', maxLevel: 10 },
    { id: 'TF_DETOXIFY', name: 'Detoxify', maxLevel: 1, requires: [R('TF_POISON', 3)] },
    { id: 'ALL_BUYING_STORE', name: 'Buying Store', maxLevel: 1, requires: [R('MC_VENDING', 1)], platinum: true },
    { id: 'MC_CARTDECORATE', name: 'Cart Decoration', maxLevel: 1, platinum: true },
  ],
  gunslinger: [
    { id: 'GS_GLITTERING', name: 'Flip the Coin', maxLevel: 5 },
    { id: 'GS_FLING', name: 'Fling', maxLevel: 1, requires: [R('GS_GLITTERING', 1)] },
    { id: 'GS_SINGLEACTION', name: 'Single Action', maxLevel: 10 },
    { id: 'GS_SNAKEEYE', name: 'Snake Eye', maxLevel: 10 },
    { id: 'GS_CHAINACTION', name: 'Chain Action', maxLevel: 10, requires: [R('GS_SINGLEACTION', 1)] },
    { id: 'GS_TRACKING', name: 'Tracking', maxLevel: 10, requires: [R('GS_SINGLEACTION', 5)] },
    { id: 'GS_DISARM', name: 'Disarm', maxLevel: 5, requires: [R('GS_TRACKING', 7)] },
    { id: 'GS_PIERCINGSHOT', name: 'Piercing Shot', maxLevel: 5, requires: [R('GS_TRACKING', 5)] },
    { id: 'GS_RAPIDSHOWER', name: 'Rapid Shower', maxLevel: 10, requires: [R('GS_CHAINACTION', 3)] },
    { id: 'GS_DESPERADO', name: 'Desperado', maxLevel: 10, requires: [R('GS_RAPIDSHOWER', 5)] },
    { id: 'GS_GATLINGFEVER', name: 'Gatling Fever', maxLevel: 10, requires: [R('GS_RAPIDSHOWER', 7), R('GS_DESPERADO', 5)] },
    { id: 'GS_DUST', name: 'Dust', maxLevel: 10, requires: [R('GS_SINGLEACTION', 5)] },
    { id: 'GS_FULLBUSTER', name: 'Full Buster', maxLevel: 10, requires: [R('GS_DUST', 3)] },
    { id: 'GS_SPREADATTACK', name: 'Spread Attack', maxLevel: 10, requires: [R('GS_FULLBUSTER', 5)] },
    { id: 'GS_GROUNDDRIFT', name: 'Ground Drift', maxLevel: 10, requires: [R('GS_SPREADATTACK', 7)] },
    { id: 'GS_TRIPLEACTION', name: 'Triple Action', maxLevel: 1, requires: [R('GS_GLITTERING', 1), R('GS_CHAINACTION', 10)] },
    { id: 'GS_BULLSEYE', name: "Bull's Eye", maxLevel: 1, requires: [R('GS_GLITTERING', 5), R('GS_TRACKING', 10)] },
    { id: 'GS_MADNESSCANCEL', name: 'Madness Canceller', maxLevel: 1, requires: [R('GS_GLITTERING', 4), R('GS_GATLINGFEVER', 10)] },
    { id: 'GS_ADJUSTMENT', name: 'Adjustment', maxLevel: 1, requires: [R('GS_GLITTERING', 4), R('GS_DISARM', 5)] },
    { id: 'GS_INCREASING', name: 'Increase Accuracy', maxLevel: 1, requires: [R('GS_GLITTERING', 2), R('GS_SNAKEEYE', 10)] },
    { id: 'GS_MAGICALBULLET', name: 'Magical Bullet', maxLevel: 1, requires: [R('GS_GLITTERING', 1)] },
    { id: 'GS_CRACKER', name: 'Cracker', maxLevel: 1, requires: [R('GS_GLITTERING', 1)] },
    // Server-spezifische Platin-/Quest-Skills:
    { id: 'GS_SIEGESTANCE', name: 'Siege Stance', maxLevel: 1, requires: [R('GS_GLITTERING', 1)], platinum: true },
    { id: 'GS_ENFEEBLEROUND', name: 'Enfeeble Round', maxLevel: 1, requires: [R('GS_SIEGESTANCE', 1)], platinum: true },
    { id: 'GS_BLASTROUND', name: 'Blast Round', maxLevel: 1, requires: [R('GS_SIEGESTANCE', 1)], platinum: true },
  ],
  ninja: [
    { id: 'NJ_TOBIDOUGU', name: 'Throwing Mastery', maxLevel: 10 },
    { id: 'NJ_SYURIKEN', name: 'Throw Shuriken', maxLevel: 10, requires: [R('NJ_TOBIDOUGU', 1)] },
    { id: 'NJ_KUNAI', name: 'Throw Kunai', maxLevel: 5, requires: [R('NJ_SYURIKEN', 5)] },
    { id: 'NJ_HUUMA', name: 'Throw Huuma Shuriken', maxLevel: 5, requires: [R('NJ_TOBIDOUGU', 5), R('NJ_KUNAI', 5)] },
    { id: 'NJ_ZENYNAGE', name: 'Throw Coins', maxLevel: 10, requires: [R('NJ_TOBIDOUGU', 10), R('NJ_HUUMA', 5)] },
    { id: 'NJ_TATAMIGAESHI', name: 'Flip Tatami', maxLevel: 5 },
    { id: 'NJ_SHADOWJUMP', name: 'Shadow Leap', maxLevel: 5, requires: [R('NJ_TATAMIGAESHI', 1)] },
    { id: 'NJ_KASUMIKIRI', name: 'Mist Slash', maxLevel: 10, requires: [R('NJ_SHADOWJUMP', 1)] },
    { id: 'NJ_KIRIKAGE', name: 'Shadow Slash', maxLevel: 5, requires: [R('NJ_KASUMIKIRI', 5)] },
    { id: 'NJ_UTSUSEMI', name: 'Cicada Skin Shedding', maxLevel: 5, requires: [R('NJ_SHADOWJUMP', 5)] },
    { id: 'NJ_NEN', name: 'Spirit of the Blade', maxLevel: 5, requires: [R('NJ_NINPOU', 5)] },
    { id: 'NJ_BUNSINJYUTSU', name: 'Illusionary Shadow', maxLevel: 10, requires: [R('NJ_UTSUSEMI', 4), R('NJ_KIRIKAGE', 3), R('NJ_NEN', 1)] },
    { id: 'NJ_NINPOU', name: 'Ninpou Training', maxLevel: 10 },
    { id: 'NJ_KOUENKA', name: 'Crimson Fire Petal', maxLevel: 10, requires: [R('NJ_NINPOU', 1)] },
    { id: 'NJ_KAENSIN', name: 'Crimson Fire Formation', maxLevel: 10, requires: [R('NJ_KOUENKA', 5)] },
    { id: 'NJ_BAKUENRYU', name: 'Raging Fire Dragon', maxLevel: 5, requires: [R('NJ_NINPOU', 10), R('NJ_KAENSIN', 7)] },
    { id: 'NJ_HYOUSENSOU', name: 'Spear of Ice', maxLevel: 10, requires: [R('NJ_NINPOU', 1)] },
    { id: 'NJ_SUITON', name: 'Water Escape Technique', maxLevel: 10, requires: [R('NJ_HYOUSENSOU', 5)] },
    { id: 'NJ_HYOUSYOURAKU', name: 'Falling Ice Pillar', maxLevel: 5, requires: [R('NJ_NINPOU', 10), R('NJ_SUITON', 7)] },
    { id: 'NJ_HUUJIN', name: 'Wind Blade', maxLevel: 10, requires: [R('NJ_NINPOU', 1)] },
    { id: 'NJ_RAIGEKISAI', name: 'Lightning Crash', maxLevel: 5, requires: [R('NJ_HUUJIN', 5)] },
    { id: 'NJ_KAMAITACHI', name: 'First Wind', maxLevel: 5, requires: [R('NJ_NINPOU', 10), R('NJ_RAIGEKISAI', 5)] },
    { id: 'NJ_ISSEN', name: 'Killing Stroke', maxLevel: 10, requires: [R('NJ_TOBIDOUGU', 7), R('NJ_KIRIKAGE', 5), R('NJ_NEN', 1)] },
    // Server-spezifische Platin-/Quest-Skills:
    { id: 'NJ_METSUBUSHI', name: 'Metsubushi', maxLevel: 1, requires: [R('NJ_SHADOWJUMP', 1)], platinum: true },
    { id: 'NJ_TAIJUTSU', name: 'Taijutsu', maxLevel: 1, platinum: true },
  ],
  taekwon: [
    { id: 'TK_RUN', name: 'Sprint', maxLevel: 10 },
    { id: 'TK_STORMKICK', name: 'Storm Kick', maxLevel: 7 },
    { id: 'TK_READYSTORM', name: 'Prepare Storm Kick', maxLevel: 1, requires: [R('TK_STORMKICK', 1)] },
    { id: 'TK_DOWNKICK', name: 'Heel Drop', maxLevel: 7 },
    { id: 'TK_READYDOWN', name: 'Prepare Heel Drop', maxLevel: 1, requires: [R('TK_DOWNKICK', 1)] },
    { id: 'TK_TURNKICK', name: 'Roundhouse Kick', maxLevel: 7 },
    { id: 'TK_READYTURN', name: 'Prepare Roundhouse', maxLevel: 1, requires: [R('TK_TURNKICK', 1)] },
    { id: 'TK_COUNTER', name: 'Counter Kick', maxLevel: 7 },
    { id: 'TK_READYCOUNTER', name: 'Prepare Counter Kick', maxLevel: 1, requires: [R('TK_COUNTER', 1)] },
    { id: 'TK_JUMPKICK', name: 'Flying Kick', maxLevel: 7 },
    { id: 'TK_DODGE', name: 'Tumbling', maxLevel: 1, requires: [R('TK_JUMPKICK', 7)] },
    { id: 'TK_HPTIME', name: 'Peaceful Break', maxLevel: 10 },
    { id: 'TK_SPTIME', name: 'Happy Break', maxLevel: 10 },
    { id: 'TK_POWER', name: 'Kihop', maxLevel: 5 },
    { id: 'TK_SEVENWIND', name: 'Warm Wind', maxLevel: 7, requires: [R('TK_HPTIME', 5), R('TK_SPTIME', 5), R('TK_POWER', 5)] },
    { id: 'TK_HIGHJUMP', name: 'Taekwon Jump', maxLevel: 5 },
    { id: 'TK_MISSION', name: 'Taekwon Mission', maxLevel: 1, requires: [R('TK_POWER', 5)] },
    // Server-spezifischer Platin-/Quest-Skill:
    { id: 'TK_VIRTUES', name: 'Taekwon Virtues', maxLevel: 1, platinum: true },
  ],
  stargladiator: [
    { id: 'SG_FEEL', name: 'Feeling of the Sun, Moon and Stars', maxLevel: 3 },
    { id: 'SG_SUN_WARM', name: 'Warmth of the Sun', maxLevel: 3, requires: [R('SG_FEEL', 1)] },
    { id: 'SG_MOON_WARM', name: 'Warmth of the Moon', maxLevel: 3, requires: [R('SG_FEEL', 2)] },
    { id: 'SG_STAR_WARM', name: 'Warmth of the Stars', maxLevel: 3, requires: [R('SG_FEEL', 3)] },
    { id: 'SG_SUN_COMFORT', name: 'Comfort of the Sun', maxLevel: 4, requires: [R('SG_FEEL', 1)] },
    { id: 'SG_MOON_COMFORT', name: 'Comfort of the Moon', maxLevel: 4, requires: [R('SG_FEEL', 2)] },
    { id: 'SG_STAR_COMFORT', name: 'Comfort of the Stars', maxLevel: 4, requires: [R('SG_FEEL', 3)] },
    { id: 'SG_HATE', name: 'Hatred of the Sun, Moon and Stars', maxLevel: 3 },
    { id: 'SG_SUN_ANGER', name: 'Anger of the Sun', maxLevel: 3, requires: [R('SG_HATE', 1)] },
    { id: 'SG_MOON_ANGER', name: 'Anger of the Moon', maxLevel: 3, requires: [R('SG_HATE', 2)] },
    { id: 'SG_STAR_ANGER', name: 'Anger of the Stars', maxLevel: 3, requires: [R('SG_HATE', 3)] },
    { id: 'SG_SUN_BLESS', name: 'Blessing of the Sun', maxLevel: 5, requires: [R('SG_FEEL', 1), R('SG_HATE', 1)] },
    { id: 'SG_MOON_BLESS', name: 'Blessing of the Moon', maxLevel: 5, requires: [R('SG_FEEL', 2), R('SG_HATE', 2)] },
    { id: 'SG_STAR_BLESS', name: 'Blessing of the Stars', maxLevel: 5, requires: [R('SG_FEEL', 3), R('SG_HATE', 3)] },
    { id: 'SG_DEVIL', name: 'Demon of the Sun, Moon and Stars', maxLevel: 10 },
    { id: 'SG_FRIEND', name: 'Friend of the Sun, Moon and Stars', maxLevel: 3 },
    { id: 'SG_KNOWLEDGE', name: 'Knowledge of the Sun, Moon and Stars', maxLevel: 10 },
    { id: 'SG_FUSION', name: 'Union of the Sun, Moon and Stars', maxLevel: 1, requires: [R('SG_KNOWLEDGE', 9)] },
    // Server-spezifischer Platin-/Quest-Skill:
    { id: 'SG_NOVA', name: 'Solar, Lunar and Stellar Nova', maxLevel: 1, platinum: true },
  ],
  soullinker: [
    { id: 'SL_ALCHEMIST', name: 'Alchemist Spirit', maxLevel: 5 },
    { id: 'SL_MONK', name: 'Monk Spirit', maxLevel: 5 },
    { id: 'SL_STAR', name: 'Star Gladiator Spirit', maxLevel: 5 },
    { id: 'SL_SAGE', name: 'Sage Spirit', maxLevel: 5 },
    { id: 'SL_CRUSADER', name: 'Crusader Spirit', maxLevel: 5 },
    { id: 'SL_SUPERNOVICE', name: 'Super Novice Spirit', maxLevel: 5 },
    { id: 'SL_KNIGHT', name: 'Knight Spirit', maxLevel: 5, requires: [R('SL_CRUSADER', 1)] },
    { id: 'SL_WIZARD', name: 'Wizard Spirit', maxLevel: 5, requires: [R('SL_SAGE', 1)] },
    { id: 'SL_PRIEST', name: 'Priest Spirit', maxLevel: 5, requires: [R('SL_MONK', 1)] },
    { id: 'SL_BARDDANCER', name: 'Bard and Dancer Spirit', maxLevel: 5 },
    { id: 'SL_ASSASIN', name: 'Assassin Spirit', maxLevel: 5 },
    { id: 'SL_ROGUE', name: 'Rogue Spirit', maxLevel: 5, requires: [R('SL_ASSASIN', 1)] },
    { id: 'SL_BLACKSMITH', name: 'Blacksmith Spirit', maxLevel: 5, requires: [R('SL_ALCHEMIST', 1)] },
    { id: 'SL_HUNTER', name: 'Hunter Spirit', maxLevel: 5, requires: [R('SL_BARDDANCER', 1)] },
    { id: 'SL_SOULLINKER', name: 'Soul Linker Spirit', maxLevel: 5, requires: [R('SL_STAR', 1)] },
    { id: 'SL_KAINA', name: 'Kaina', maxLevel: 7, requires: [R('TK_SPTIME', 1)] },
    { id: 'SL_KAIZEL', name: 'Kaizel', maxLevel: 7, requires: [R('SL_PRIEST', 1)] },
    { id: 'SL_KAAHI', name: 'Kaahi', maxLevel: 7, requires: [R('SL_PRIEST', 1), R('SL_CRUSADER', 1)] },
    { id: 'SL_KAUPE', name: 'Kaupe', maxLevel: 3, requires: [R('SL_ROGUE', 1)] },
    { id: 'SL_KAITE', name: 'Kaite', maxLevel: 7, requires: [R('SL_WIZARD', 1)] },
    { id: 'SL_SWOO', name: 'Eswoo', maxLevel: 7, requires: [R('SL_PRIEST', 1)] },
    { id: 'SL_STIN', name: 'Estin', maxLevel: 7, requires: [R('SL_WIZARD', 1)] },
    { id: 'SL_STUN', name: 'Estun', maxLevel: 7, requires: [R('SL_WIZARD', 1)] },
    { id: 'SL_SMA', name: 'Esma', maxLevel: 10, requires: [R('SL_STIN', 7), R('SL_STUN', 7)] },
    { id: 'SL_SKE', name: 'Eske', maxLevel: 3, requires: [R('SL_KNIGHT', 1)] },
    { id: 'SL_SKA', name: 'Eska', maxLevel: 3, requires: [R('SL_MONK', 1)] },
    { id: 'SL_HIGH', name: 'Espa', maxLevel: 5, requires: [R('SL_SUPERNOVICE', 5)] },
    // Server-spezifische Platin-/Quest-Skills:
    { id: 'SL_KASHU', name: 'Kashu', maxLevel: 1, requires: [R('TK_VIRTUES', 1)], platinum: true },
    { id: 'SL_WEAVESELF', name: 'Weave Self', maxLevel: 1, platinum: true },
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
      let requires = e.requires ?? []
      // Jede First-Class-Fähigkeit setzt Basic Skill 9 voraus (entspricht dem
      // Jobwechsel Novice -> First Class). Wird per Auto-Lernen mitgezogen.
      if (c.tier === 'first' && !requires.some((r) => r.id === 'NV_BASIC')) {
        requires = [...requires, R('NV_BASIC', 9)]
      }
      out.push({ ...e, requires, classId: c.id })
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
