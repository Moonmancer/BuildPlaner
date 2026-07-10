---
name: build
description: Baut das BuildPlaner-Projekt (npm run build, tsc + vite) und zeigt die letzten Zeilen der Ausgabe. Nutzen, um nach Code-Änderungen zu prüfen, dass Typecheck und Produktions-Build durchlaufen.
shell: powershell
---

Ergebnis des Produktions-Builds (`tsc -b && vite build`):

!`Set-Location 'F:\Dev\BuildPlaner'; npm run build 2>&1 | Select-Object -Last 25`

Bewerte die Ausgabe: Steht dort `✓ built in …`, war der Build erfolgreich. Bei TypeScript- oder Vite-Fehlern die Fehlermeldungen analysieren und beheben.
