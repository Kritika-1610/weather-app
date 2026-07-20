/* ==========================================================================
   SKYLINE API layer
   Backed entirely by Open-Meteo (https://open-meteo.com) — free, no API key,
   no signup. Three endpoints:
     1. Geocoding  — turn a typed city name into lat/lon + place metadata
     2. Forecast   — current conditions, hourly, and 7-day daily forecast
     3. Air Quality— current US AQI + pollutant breakdown
   ========================================================================== */

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Search for cities matching a typed name. Returns up to 5 candidates. */
async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
  const data = await fetchJSON(url);
  return (data.results || []).map((r) => ({
    id: `${r.id}`,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

/** Reverse-ish helper: build a label like "Austin, Texas, United States" */
function placeLabel(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

/** Fetch current + hourly + daily forecast for a lat/lon.
 *  unit: "celsius" | "fahrenheit" — Open-Meteo does the conversion server-side,
 *  including wind speed units (km/h vs mph), so numbers stay consistent. */
async function fetchForecast(latitude, longitude, unit = "celsius") {
  const params = new URLSearchParams({
    latitude, longitude,
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature",
      "is_day", "precipitation", "weather_code", "cloud_cover",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "surface_pressure",
    ].join(","),
    hourly: ["temperature_2m", "weather_code", "precipitation_probability"].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min",
      "sunrise", "sunset", "uv_index_max", "precipitation_probability_max", "wind_speed_10m_max",
    ].join(","),
    temperature_unit: unit === "fahrenheit" ? "fahrenheit" : "celsius",
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
    timezone: "auto",
    forecast_days: "8",
  });
  return fetchJSON(`${FORECAST_URL}?${params.toString()}`);
}

/** Fetch current air quality (US AQI + pollutants) for a lat/lon. */
async function fetchAirQuality(latitude, longitude) {
  const params = new URLSearchParams({
    latitude, longitude,
    current: ["us_aqi", "pm2_5", "pm10", "ozone", "nitrogen_dioxide"].join(","),
    timezone: "auto",
  });
  try {
    return await fetchJSON(`${AIR_QUALITY_URL}?${params.toString()}`);
  } catch (e) {
    // Air quality is a nice-to-have; never let it break the main forecast.
    return null;
  }
}

/** Try the browser Geolocation API, resolving to {latitude, longitude}. */
function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation isn't supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/**
 * Given raw coordinates (e.g. from geolocation), resolve a friendly place
 * name via reverse-ish lookup: Open-Meteo's geocoding search doesn't do
 * true reverse geocoding, so we label it generically and let the forecast's
 * own timezone field help orient the user.
 */
function coordsToPlace(latitude, longitude) {
  return {
    id: `geo-${latitude.toFixed(2)}-${longitude.toFixed(2)}`,
    name: "My Location",
    admin1: "",
    country: "",
    latitude,
    longitude,
  };
}
