# Weather Web App

A small, dependency-free weather app built with plain HTML, CSS, and JavaScript — no frameworks, no build step. You pick a country and then a city, and it fetches the weather from the free [Open-Meteo](https://open-meteo.com/) API (no API key required).

## Features

- Branded as **Meteora** with an SVG logo, plus a left sidebar menu (Page 1–5) linking to separate pages
- Pick a country, then a city (cascading dropdowns from a built-in list); defaults to Budapest on load
- Current weather: temperature, conditions, wind, and humidity (°C, km/h)
- 7-day forecast: each day shows the date, a weather emoji, and the high/low temperature
- Interactive map (Leaflet + OpenStreetMap) with a marker on the searched city
- Left sidebar widget with live exchange rates (BTC-USD, ETH-USD) from the Coinbase public API, auto-refreshing every 60s
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

1. **Locations** — countries and their cities (with coordinates) come from a built-in list in `locations.js`. Selecting a city gives its latitude/longitude directly, so no geocoding call is needed.
2. **Forecast** — `https://api.open-meteo.com/v1/forecast` returns current conditions and a 7-day daily forecast for those coordinates.
3. **Map** — those same coordinates are used to center a [Leaflet](https://leafletjs.com/) map (OpenStreetMap tiles, no API key) and drop a marker on the city.

To add more places, edit `locations.js` — each country maps to an array of `{ name, latitude, longitude }`.

WMO weather codes are mapped to emojis and human-readable descriptions in `script.js`.

## Files

- `index.html` — main weather page (logo, sidebar menu, weather UI)
- `page1.html` … `page5.html` — the five menu pages
- `styles.css` — styling and responsive layout
- `locations.js` — built-in country → cities dataset with coordinates
- `script.js` — dropdown logic, API calls, rendering, and error handling
