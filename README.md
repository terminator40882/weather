# Himmel — Wetter PWA

A fullscreen progressive web app showing current conditions, a 2-hour
precipitation nowcast, an animated rain radar centred on your location,
detailed wind, an hourly and 7-day forecast, and official DWD
severe-weather warnings.

- **Forecast data:** [Open-Meteo](https://open-meteo.com) — keyless, CORS-enabled
  (`current`, `minutely_15` precipitation, wind, `hourly`, `daily`).
- **Rain radar:** [RainViewer](https://www.rainviewer.com) radar tiles on a
  [CARTO](https://carto.com)/[OpenStreetMap](https://www.openstreetmap.org)
  dark base map rendered with [Leaflet](https://leafletjs.com) — keyless.
  Centred on your position with a **5 km** (default) / **20 km** toggle, and
  it loops through the recent + nowcast frames.
- **Warnings:** DWD via [Bright Sky](https://brightsky.dev) — keyless, CORS-enabled.
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
