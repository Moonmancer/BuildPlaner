// Pre-Renewal Klassen-Registry.
// parent = Vorgängerklasse für die Skill-Vererbung (Phase 3c+): die verfügbaren Skills
// einer Klasse sind ihre eigenen plus rekursiv die des parent.
// maxJobLevel: Defaults (Novice 10, 1st 50, 2nd 50, Transcendent 70); abweichend laut Nutzer:
// Super Novice 99, Ninja 70, Gunslinger 70.

export type ClassTier =
  | 'novice'
  | 'first'
  | 'second'
  | 'expanded'
  | 'transcendent'

export interface JobClass {
  id: string
  name: string
  tier: ClassTier
  parent: string | null
  isRebirth: boolean
  maxJobLevel: number
}

export const TIER_LABELS: Record<ClassTier, string> = {
  novice: 'Novice',
  first: 'First Class',
  second: 'Second Class',
  expanded: 'Expanded',
  transcendent: 'Rebirth (Transcendent)',
}

// Reihenfolge der Tiers für die Gruppierung im Dropdown.
export const TIER_ORDER: ClassTier[] = [
  'novice',
  'first',
  'second',
  'expanded',
  'transcendent',
]

export const CLASSES: JobClass[] = [
  // --- Novice ---
  { id: 'novice', name: 'Novice', tier: 'novice', parent: null, isRebirth: false, maxJobLevel: 10 },

  // --- First Class (parent: novice) ---
  { id: 'swordsman', name: 'Swordsman', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'mage', name: 'Mage', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'archer', name: 'Archer', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'merchant', name: 'Merchant', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'thief', name: 'Thief', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'acolyte', name: 'Acolyte', tier: 'first', parent: 'novice', isRebirth: false, maxJobLevel: 50 },

  // --- Second Class (parent: jeweilige First Class) ---
  { id: 'knight', name: 'Knight', tier: 'second', parent: 'swordsman', isRebirth: false, maxJobLevel: 50 },
  { id: 'crusader', name: 'Crusader', tier: 'second', parent: 'swordsman', isRebirth: false, maxJobLevel: 50 },
  { id: 'wizard', name: 'Wizard', tier: 'second', parent: 'mage', isRebirth: false, maxJobLevel: 50 },
  { id: 'sage', name: 'Sage', tier: 'second', parent: 'mage', isRebirth: false, maxJobLevel: 50 },
  { id: 'hunter', name: 'Hunter', tier: 'second', parent: 'archer', isRebirth: false, maxJobLevel: 50 },
  { id: 'bard', name: 'Bard', tier: 'second', parent: 'archer', isRebirth: false, maxJobLevel: 50 },
  { id: 'dancer', name: 'Dancer', tier: 'second', parent: 'archer', isRebirth: false, maxJobLevel: 50 },
  { id: 'blacksmith', name: 'Blacksmith', tier: 'second', parent: 'merchant', isRebirth: false, maxJobLevel: 50 },
  { id: 'alchemist', name: 'Alchemist', tier: 'second', parent: 'merchant', isRebirth: false, maxJobLevel: 50 },
  { id: 'assassin', name: 'Assassin', tier: 'second', parent: 'thief', isRebirth: false, maxJobLevel: 50 },
  { id: 'rogue', name: 'Rogue', tier: 'second', parent: 'thief', isRebirth: false, maxJobLevel: 50 },
  { id: 'priest', name: 'Priest', tier: 'second', parent: 'acolyte', isRebirth: false, maxJobLevel: 50 },
  { id: 'monk', name: 'Monk', tier: 'second', parent: 'acolyte', isRebirth: false, maxJobLevel: 50 },

  // --- Expanded ---
  { id: 'supernovice', name: 'Super Novice', tier: 'expanded', parent: 'novice', isRebirth: false, maxJobLevel: 99 },
  { id: 'taekwon', name: 'Taekwon Kid', tier: 'expanded', parent: 'novice', isRebirth: false, maxJobLevel: 50 },
  { id: 'stargladiator', name: 'Star Gladiator', tier: 'expanded', parent: 'taekwon', isRebirth: false, maxJobLevel: 50 },
  { id: 'soullinker', name: 'Soul Linker', tier: 'expanded', parent: 'taekwon', isRebirth: false, maxJobLevel: 50 },
  { id: 'ninja', name: 'Ninja', tier: 'expanded', parent: 'novice', isRebirth: false, maxJobLevel: 70 },
  { id: 'gunslinger', name: 'Gunslinger', tier: 'expanded', parent: 'novice', isRebirth: false, maxJobLevel: 70 },

  // --- Rebirth / Transcendent (isRebirth) ---
  { id: 'highnovice', name: 'High Novice', tier: 'transcendent', parent: null, isRebirth: true, maxJobLevel: 10 },
  { id: 'lordknight', name: 'Lord Knight', tier: 'transcendent', parent: 'knight', isRebirth: true, maxJobLevel: 70 },
  { id: 'highpriest', name: 'High Priest', tier: 'transcendent', parent: 'priest', isRebirth: true, maxJobLevel: 70 },
  { id: 'highwizard', name: 'High Wizard', tier: 'transcendent', parent: 'wizard', isRebirth: true, maxJobLevel: 70 },
  { id: 'sniper', name: 'Sniper', tier: 'transcendent', parent: 'hunter', isRebirth: true, maxJobLevel: 70 },
  { id: 'whitesmith', name: 'Whitesmith', tier: 'transcendent', parent: 'blacksmith', isRebirth: true, maxJobLevel: 70 },
  { id: 'assassincross', name: 'Assassin Cross', tier: 'transcendent', parent: 'assassin', isRebirth: true, maxJobLevel: 70 },
  { id: 'paladin', name: 'Paladin', tier: 'transcendent', parent: 'crusader', isRebirth: true, maxJobLevel: 70 },
  { id: 'champion', name: 'Champion', tier: 'transcendent', parent: 'monk', isRebirth: true, maxJobLevel: 70 },
  { id: 'professor', name: 'Professor', tier: 'transcendent', parent: 'sage', isRebirth: true, maxJobLevel: 70 },
  { id: 'clown', name: 'Clown', tier: 'transcendent', parent: 'bard', isRebirth: true, maxJobLevel: 70 },
  { id: 'gypsy', name: 'Gypsy', tier: 'transcendent', parent: 'dancer', isRebirth: true, maxJobLevel: 70 },
  { id: 'creator', name: 'Creator', tier: 'transcendent', parent: 'alchemist', isRebirth: true, maxJobLevel: 70 },
  { id: 'stalker', name: 'Stalker', tier: 'transcendent', parent: 'rogue', isRebirth: true, maxJobLevel: 70 },
]

export const CLASS_BY_ID: Record<string, JobClass> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c]),
)

export function getClass(id: string | null | undefined): JobClass | undefined {
  return id ? CLASS_BY_ID[id] : undefined
}

/** Vererbungskette einer Klasse von der Wurzel bis zur Klasse selbst (für Skill-Vererbung). */
export function classChain(id: string | null | undefined): JobClass[] {
  const chain: JobClass[] = []
  let cur = getClass(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = getClass(cur.parent)
  }
  return chain
}
