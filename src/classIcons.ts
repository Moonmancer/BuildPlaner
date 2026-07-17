// Klassen-Portraits (himeyasha img/chr/<code>.png, lokal gespiegelt nach public/class-icons/).
// Gegenderte First Classes + Taekwon Kid haben je ein m/f-Portrait.

export type IconCode = string | { m: string; f: string }

export const CLASS_ICON: Record<string, IconCode> = {
  lordknight: 'lkn2',
  knight: 'knt2',
  swordsman: { m: '1swdm2', f: '1swdf2' },
  crusader: 'cru2',
  paladin: 'pld2',
  highpriest: 'hpr2',
  priest: 'pri2',
  acolyte: { m: '1acom2', f: '1acof2' },
  monk: 'mon2',
  champion: 'chp2',
  highwizard: 'hwz2',
  wizard: 'wiz2',
  mage: { m: '1magm2', f: '1magf2' },
  sage: 'sag2',
  professor: 'pro2',
  whitesmith: 'wsm2',
  blacksmith: 'bsm2',
  merchant: { m: '1merm2', f: '1merf2' },
  alchemist: 'alc2',
  creator: 'cre2',
  assassincross: 'asx2',
  assassin: 'ass2',
  thief: { m: '1thim2', f: '1thif2' },
  rogue: 'rog2',
  stalker: 'chs2',
  sniper: 'snp2',
  hunter: 'hnt2',
  archer: { m: '1arcm2', f: '1arcf2' },
  bard: 'brd2',
  dancer: 'dan2',
  clown: 'clw2',
  gypsy: 'gyp2',
  stargladiator: 'fst2',
  taekwon: { m: 'tkkm2', f: 'tkkf2' },
  soullinker: 'slk2',
  gunslinger: 'gun2',
  supernovice: 'nov2',
  ninja: 'nnj2',
  novice: { m: '1novm2', f: '1novf2' },
}

/** Anordnung im Auswahl-Modal (Reihen à 5 Spalten; null = leere Zelle für Spaltenausrichtung). */
export const CLASS_LAYOUT: (string | null)[][] = [
  ['lordknight', 'knight', 'swordsman', 'crusader', 'paladin'],
  ['highpriest', 'priest', 'acolyte', 'monk', 'champion'],
  ['highwizard', 'wizard', 'mage', 'sage', 'professor'],
  ['whitesmith', 'blacksmith', 'merchant', 'alchemist', 'creator'],
  ['assassincross', 'assassin', 'thief', 'rogue', 'stalker'],
  ['sniper', 'hunter', 'archer', 'bard', 'clown'],
  [null, null, null, 'dancer', 'gypsy'],
  ['stargladiator', 'taekwon', 'soullinker'],
  ['gunslinger', 'supernovice', 'ninja', 'novice'],
]

/** Alle zu spiegelnden himeyasha-Bildcodes (für das Download-Script). */
export const ALL_ICON_CODES: string[] = Object.values(CLASS_ICON).flatMap((c) =>
  typeof c === 'string' ? [c] : [c.m, c.f],
)

/** Lokaler Pfad eines gespiegelten Portraits. */
export const classIconSrc = (code: string): string =>
  `${import.meta.env.BASE_URL}class-icons/${code}.png`
