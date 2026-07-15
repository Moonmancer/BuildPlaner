// Manuelle Layout-Korrekturen für die Baum-Ansicht. Werden von scripts/genTreeGrid.ts NACH dem
// Parsen der himeyasha-Diagramme über das generierte Raster gelegt – d.h. sie überleben ein
// erneutes `npm run gen:treegrid`. Pro Klasse: Skill-ID -> [Spalte, Zeile].
export const TREE_GRID_OVERRIDES: Record<string, Record<string, [number, number]>> = {
  lordknight: {
    // Increase HP Recovery und Relax getauscht (Relax oben, HP-Rec darunter).
    LK_TENSIONRELAX: [0, 5],
    SM_RECOVERY: [0, 6],
  },
  soullinker: {
    // Peaceful Break und Mild Wind getauscht.
    TK_HPTIME: [3, 3],
    TK_SEVENWIND: [3, 2],
  },
  taekwon: {
    // Peaceful Break und Mild Wind getauscht (wie Soul Linker).
    TK_HPTIME: [3, 3],
    TK_SEVENWIND: [3, 2],
  },
}
