# Skyline — a weather app that shows you the sky

Skyline is a single-page weather app built with **HTML, CSS, JavaScript, and React**.
Search any city on Earth and see live conditions, an hourly and 7-day forecast,
UV index, air quality, and wind — all wrapped in a background that visually
shifts through night → dawn → day → dusk to match the real local time of the
place you're looking at.

## Tech stack

- **React 18** (via CDN, UMD build) for the UI
- **Babel Standalone** (via CDN) to compile JSX directly in the browser — no build step, no `npm install`
- **Vanilla CSS** with custom properties for the whole design system (no framework)
- **[Open-Meteo](https://open-meteo.com)** for all data — 100% free, no API key, no signup required:
  - Geocoding API — turns a typed city name into coordinates
  - Forecast API — current conditions, 24-hour, and 7-day forecast
  - Air Quality API — current US AQI and pollutant levels
  - Browser Geolocation API — "use my location" button

Because it's plain script tags + CDN libraries, there's nothing to build or
install. Just open `index.html`.

## Running it

**Option A — just open the file**
Double-click `index.html`, or drag it into a browser tab. That's it.

**Option B — local server (recommended, avoids some browsers' file:// quirks)**
```bash
cd skyline
python3 -m http.server 8080
# then open http://localhost:8080
```
or
```bash
npx serve .
```

An internet connection is required at runtime (to load React/Babel from CDN
and to call the Open-Meteo APIs) — there's no local install step, but it's
not fully offline.

## Features

- 🔍 **Search any city** — live-filtered geocoding suggestions as you type
- 📍 **Use my location** — one-tap geolocation lookup
- 🌅 **Sky backdrop that matches real time-of-day** — night, dawn, day, and
  dusk gradients, with a sun/moon that moves along an arc based on the
  actual sunrise/sunset times for the place you're viewing
- 🌧️ **Weather-reactive animation** — drifting clouds always; rain or snow
  layers appear automatically when conditions call for it
- 🌡️ **°C / °F toggle** — converted server-side by the API, so wind units
  switch correctly too (km/h ↔ mph)
- 🌗 **Light / dark theme toggle**, independent of the sky backdrop
- ⭐ **Favorite cities** — save cities to a chip row, stored in
  `localStorage`, one tap to switch between them
- ⏱️ **Hourly strip** — scrollable next-24-hours view with icons and rain
  probability
- 📅 **7-day forecast** — with a visual high/low range bar per day
- ☀️ **UV index** with a color-coded scale
- 🫁 **Air quality (US AQI)** with PM2.5 / ozone readout
- 🧭 **Wind compass** — live needle showing direction, plus speed and gusts
- 🌇 **Sunrise/sunset arc** — shows where "now" sits between sunrise and sunset
- 💾 **Remembers your last city, unit, and theme** between visits
- ♿ Respects `prefers-reduced-motion`, keyboard-accessible search (Enter
  selects the top result), visible focus states

## Project structure

```
skyline/
├── index.html          # entry point, loads React/Babel from CDN
├── css/
│   └── style.css       # full design system (tokens, layout, animation)
├── js/
│   ├── weatherCodes.js # WMO weather-code → label/icon, SVG icon set
│   ├── api.js          # Open-Meteo fetch helpers (geocoding, forecast, AQ)
│   ├── components.js   # presentational React components
│   └── app.js          # main App component — state + data fetching
└── README.md
```

## Notes on the API

All requests go straight from the browser to `open-meteo.com` — no backend,
no API key, no rate-limit headaches for personal/demo use. If you later want
to swap in a different provider (e.g. OpenWeatherMap), the only file you
need to touch is `js/api.js`; the components consume a plain JS object shape
and don't know which provider it came from.
