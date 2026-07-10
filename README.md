# BuildPlaner

Web-App zum Planen und Verwalten von **Stats und Skills für Ragnarok-Online-Charaktere** (Pre-Renewal).
Läuft vollständig im Browser – keine Server, keine Datenbank.

**Live:** https://Moonmancer.github.io/BuildPlaner/

## Features (geplant)

- Builds anlegen, benennen und verwalten
- **Milestones** je Build (z.B. „Lvl 10", „Endgame") mit eigenen Stats & Skills
- Speicherung im **localStorage** des Browsers
- **XML**-Export und -Import einzelner oder aller Builds
- Import aus den Share-URLs gängiger Calculators
  (calc.arcadia-online.org, skills.irowiki.org, irowiki.org/~himeyasha/skill7)
- Validierung nach Pre-Renewal-Regeln (Stat-Kosten, Skill-Voraussetzungen, Skillpunkt-Budget)

## Roadmap

| Phase | Inhalt |
|-------|--------|
| 1 | Projekt-Gerüst + GitHub-Pages-Deployment |
| 2 | Datenmodell, localStorage, Builds & Milestones |
| 3 | Pre-Renewal Stats + Skill-Bäume (First → Second → Expanded → Rebirth) |
| 4 | XML Export/Import |
| 5 | Import aus Calculator-URLs |

## Entwicklung

Voraussetzung: Node.js 20+.

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server starten
npm run build    # Produktions-Build nach dist/
npm run preview  # Produktions-Build lokal testen
```

## Deployment

Jeder Push auf `main` baut die App und veröffentlicht sie via GitHub Actions auf GitHub Pages
(siehe `.github/workflows/deploy.yml`). Der `base`-Pfad in `vite.config.ts` (`/BuildPlaner/`)
muss dem Repo-Namen entsprechen.

## Tech-Stack

React + TypeScript + Vite.
