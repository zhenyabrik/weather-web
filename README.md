# Weather Web App

A small, dependency-free weather app built with plain HTML, CSS, and JavaScript — no frameworks, no build step. It uses the free [Open-Meteo](https://open-meteo.com/) APIs (no API key required) to geocode a city name and fetch its weather.

## Features

- Search any city by name
- Current weather: temperature, conditions, wind, and humidity (°C, km/h)
- 7-day forecast: each day shows the date, a weather emoji, and the high/low temperature
- Interactive map (Leaflet + OpenStreetMap) with a marker on the searched city
- Clean, modern, responsive UI in English
- Graceful error handling for "city not found" and network failures

## How to run

No installation or build is needed.

**Option A — open the file directly**

Open `index.html` in any modern browser (double-click it, or drag it into a browser tab). The Open-Meteo APIs support CORS, so it works straight from the filesystem.

**Option B — serve it locally** (recommended)

From this folder, run any static server, for example:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000 in your browser.

## Advertising (Google AdSense)

An ad block (Google AdSense) sits below the 7-day forecast. To make it show real ads you must plug in your own AdSense account:

1. In `index.html`, replace **`ca-pub-XXXXXXXXXXXXXXXX`** (it appears twice — in the loader `<script>` in `<head>` and in the `data-ad-client` of the `<ins>` block) with your AdSense **publisher ID**.
2. Replace the `data-ad-slot="0000000000"` value with your ad unit's **slot ID** (created in the AdSense dashboard).

Notes:
- Ads only appear after Google **approves your site**; until then (and on `localhost` / `file://`) the slot stays empty — that's expected.
- The styled placeholder box with the "Advertisement" label remains visible regardless, so the layout doesn't jump.

## How it works

1. **Geocoding** — `https://geocoding-api.open-meteo.com/v1/search` turns the city name into latitude/longitude.
2. **Forecast** — `https://api.open-meteo.com/v1/forecast` returns current conditions and a 7-day daily forecast for those coordinates.
3. **Map** — those same coordinates are used to center a [Leaflet](https://leafletjs.com/) map (OpenStreetMap tiles, no API key) and drop a marker on the city.

WMO weather codes are mapped to emojis and human-readable descriptions in `script.js`.

## Files

- `index.html` — markup and structure
- `styles.css` — styling and responsive layout
- `script.js` — API calls, rendering, and error handling
