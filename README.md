# Himmel — Wetter PWA

A fullscreen progressive web app showing current conditions, a 2-hour
precipitation nowcast, an animated rain radar centred on your location,
detailed wind, an hourly and 7-day forecast, and official DWD
severe-weather warnings.

- **Forecast data:** [Open-Meteo](https://open-meteo.com) — keyless, CORS-enabled
  (`current`, `minutely_15` precipitation, wind, `hourly`, `daily`).
- **Weather maps** (all keyless, CORS-enabled, on a [CARTO](https://carto.com)/[OpenStreetMap](https://www.openstreetmap.org)
  dark base map via [Leaflet](https://leafletjs.com), bundled in `vendor/`, no CDN):
  - **Radar** — switchable between [RainViewer](https://www.rainviewer.com)
    and [DWD](https://www.dwd.de) `Niederschlagsradar` (DWD GeoServer WMS,
    **default**) at the press of a button (only one shown at a time), centred
    on your position. Full container width in portrait; capped at 420px in
    landscape so it doesn't stretch across a much wider-than-tall screen.
    A thin scrubber steps through the timeline — recent past **and** the
    forecast/nowcast into the future. It opens on the current time and never
    auto-advances. Every frame is preloaded as its own layer (opacity-swapped),
    so scrubbing the timeline is instant with no re-fetching or stutter.
  - The map names its provider underneath.
- **7-day min/max chart, right below the radar:** a minimalist glance-only
  chart — one vertical line per day from **Heute** onward, its length and
  position scaled to the week's overall temperature span, with the day's max
  written right above the line and its min right below. No icons, no extra
  detail; the full breakdown lives in the day-by-day list further down.
- **7-day icons:** [Meteocons](https://bas.dev/work/meteocons) by Bas Milius
  (MIT), animated SVGs bundled in `vendor/icons/`, mapped from the WMO codes.
  Each day is split into **four 6-hour parts — nachts / morgens / mittags /
  abends**, rendered full-bleed (edge to edge) for larger, clearer icons. Each
  part shows one main icon for the **average/dominant** condition (from the
  hourly `weather_code` series), and, if the part contains stronger outliers,
  up to **two small icons** below it for the most extreme deviations (e.g.
  mostly cloudy, with hail and drizzle shown underneath). Tapping a 6-hour
  part highlights it and expands an hourly temperature/condition breakdown
  for that window below the day; expanding another part collapses
  the previously open one (only one at a time, across all days).
- **Wind & Feuchte, next to the temperature:** shown from Open-Meteo by
  default, switchable with one button to the DWD station network via
  [Bright Sky](https://brightsky.dev) — the caption underneath always names
  the active provider.
- **Warnings:** DWD via Bright Sky — keyless, CORS-enabled.
- **Location names:** BigDataCloud reverse geocoding (keyless).
- **Compass-aligned wind:** when the device exposes an absolute orientation /
  compass heading, the wind arrow rotates to your viewing direction;
  otherwise it stays north-up. On iOS, tap **Kompass** to grant motion access.
- No backend, no API keys — everything runs client-side. Falls back to
  Frankfurt am Main if location access is denied.

## Run locally

Service workers and geolocation need a secure context, so use a local server
(not `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

### Option A — gh CLI (fastest)

From inside this folder:

```bash
git init -b main
git add .
git commit -m "Himmel weather PWA"
gh repo create weather --public --source=. --push
gh api -X POST repos/{owner}/weather/pages -f source.branch=main -f source.path=/
```

Replace `{owner}` with your GitHub username. Pages goes live in ~1 minute at:

```
https://<your-username>.github.io/weather/
```

### Option B — web UI

1. Create a new **public** repo named `weather` at https://github.com/new
   (leave it empty — no README).
2. Push this folder:
   ```bash
   git init -b main
   git add .
   git commit -m "Himmel weather PWA"
   git remote add origin https://github.com/<your-username>/weather.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: **main**, folder **/ (root)** → **Save**.
4. Wait ~1 min, then open `https://<your-username>.github.io/weather/`.

## Install as a fullscreen app

Open the Pages URL on your phone → browser menu → **Add to Home Screen**.
Launched from the home screen it runs fullscreen (no browser chrome).
There's also a **Vollbild** button for in-browser fullscreen.

## Notes

- All asset paths are relative, so the app works correctly from the
  `/weather/` subpath that Pages serves it under.
- `.nojekyll` is included so GitHub serves every file untouched.
- Attribution to Open-Meteo and DWD is shown in the footer; the radar map
  carries its own RainViewer, OpenStreetMap and CARTO attribution, as their
  licenses request.
