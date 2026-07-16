# Icon-Entwürfe

Drei App-Icon-Varianten in der Farbwelt der App (`--ink #0f1722`, `--warm #e8b27a`, `--rain #5fb0e6`).
**Noch nicht eingebunden** — `index.html`, `manifest.webmanifest` und `sw.js` sind unverändert.

Vorschau: `preview.html` im Browser öffnen (zeigt alle Varianten in mehreren Größen,
Kreis-Maske und Homescreen-Vergleich mit dem aktuellen Icon).

## Varianten

| Ordner | Motiv |
|---|---|
| `a-abenddaemmerung/` | Tiefstehende Sonne über dem Horizont mit Spiegelung — der Abendhimmel der App |
| `b-sonne-regen/` | Amber-Sonne mit Strahlen über Regenstrichen in den App-Blautönen |
| `c-kurve/` | Temperaturkurve (7-Tage-Chart) von Blau nach Amber, endet in der Sonne |

## Dateien pro Variante

- `icon.svg` — Master (abgerundetes Quadrat, transparente Ecken)
- `icon-maskable.svg` — Master vollflächig, Motiv in der 80%-Safe-Zone
- `favicon.svg` — vereinfacht für 16–32 px
- `icon-192.png`, `icon-512.png` — gerendert aus `icon.svg`
- `icon-maskable-512.png`, `apple-touch-icon.png` (180×180) — gerendert aus `icon-maskable.svg`

## Eine Variante übernehmen

1. Die vier PNGs der gewählten Variante ins Repo-Root kopieren (ersetzen dort
   `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`).
2. Optional `favicon.svg` ins Root kopieren und in `index.html` verlinken:
   `<link rel="icon" href="favicon.svg" type="image/svg+xml" />`
3. In `sw.js` die Cache-Version erhöhen, damit installierte PWAs die neuen
   Icons ausliefern; prüfen, ob dort Icon-Dateien in der Precache-Liste stehen.
4. Danach kann `icon-drafts/` gelöscht werden.
