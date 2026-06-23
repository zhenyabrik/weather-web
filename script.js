"use strict";

// WMO weather interpretation codes -> emoji + description.
// https://open-meteo.com/en/docs (see "Weather variable documentation")
const WEATHER_CODE_MAP = {
  0: { emoji: "☀️", description: "Clear sky" },
  1: { emoji: "🌤️", description: "Mainly clear" },
  2: { emoji: "⛅", description: "Partly cloudy" },
  3: { emoji: "☁️", description: "Overcast" },
  45: { emoji: "🌫️", description: "Fog" },
  48: { emoji: "🌫️", description: "Depositing rime fog" },
  51: { emoji: "🌦️", description: "Light drizzle" },
  53: { emoji: "🌦️", description: "Moderate drizzle" },
  55: { emoji: "🌦️", description: "Dense drizzle" },
  56: { emoji: "🌧️", description: "Light freezing drizzle" },
  57: { emoji: "🌧️", description: "Dense freezing drizzle" },
  61: { emoji: "🌧️", description: "Slight rain" },
  63: { emoji: "🌧️", description: "Moderate rain" },
  65: { emoji: "🌧️", description: "Heavy rain" },
  66: { emoji: "🌧️", description: "Light freezing rain" },
  67: { emoji: "🌧️", description: "Heavy freezing rain" },
  71: { emoji: "🌨️", description: "Slight snow" },
  73: { emoji: "🌨️", description: "Moderate snow" },
  75: { emoji: "❄️", description: "Heavy snow" },
  77: { emoji: "🌨️", description: "Snow grains" },
  80: { emoji: "🌦️", description: "Slight rain showers" },
  81: { emoji: "🌧️", description: "Moderate rain showers" },
  82: { emoji: "⛈️", description: "Violent rain showers" },
  85: { emoji: "🌨️", description: "Slight snow showers" },
  86: { emoji: "❄️", description: "Heavy snow showers" },
  95: { emoji: "⛈️", description: "Thunderstorm" },
  96: { emoji: "⛈️", description: "Thunderstorm with slight hail" },
  99: { emoji: "⛈️", description: "Thunderstorm with heavy hail" },
};

const FALLBACK_WEATHER = { emoji: "🌡️", description: "Unknown" };

function describeWeather(code) {
  return WEATHER_CODE_MAP[code] || FALLBACK_WEATHER;
}

// Error type so the UI can tell "city not found" apart from network errors.
class CityNotFoundError extends Error {}

// --- DOM references ---
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const button = document.getElementById("search-button");
const statusEl = document.getElementById("status");

const currentEl = document.getElementById("current");
const currentIcon = document.getElementById("current-icon");
const currentTemp = document.getElementById("current-temp");
const currentPlace = document.getElementById("current-place");
const currentDesc = document.getElementById("current-desc");
const currentWind = document.getElementById("current-wind");
const currentHumidity = document.getElementById("current-humidity");

const forecastSection = document.getElementById("forecast-section");
const forecastGrid = document.getElementById("forecast");

const mapSection = document.getElementById("map-section");
let map = null;
let marker = null;

// --- API calls ---
async function geocodeCity(name) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?name=" +
    encodeURIComponent(name) +
    "&count=1&language=en&format=json";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed (" + res.status + ")");

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new CityNotFoundError('No results for "' + name + '"');
  }
  return data.results[0];
}

async function getForecast(lat, lon) {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=" +
    lat +
    "&longitude=" +
    lon +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&timezone=auto&forecast_days=7";

  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast request failed (" + res.status + ")");
  return res.json();
}

// --- Rendering ---
function formatPlace(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function renderCurrent(current, place) {
  const weather = describeWeather(current.weather_code);
  currentIcon.textContent = weather.emoji;
  currentTemp.textContent = Math.round(current.temperature_2m) + "°C";
  currentPlace.textContent = formatPlace(place);
  currentDesc.textContent = weather.description;
  currentWind.textContent = Math.round(current.wind_speed_10m) + " km/h";
  currentHumidity.textContent = Math.round(current.relative_humidity_2m) + "%";
  currentEl.hidden = false;
}

function renderForecast(daily) {
  forecastGrid.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + "T00:00:00");
    const weather = describeWeather(daily.weather_code[i]);

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML =
      '<div class="day-card__name">' +
      date.toLocaleDateString("en-US", { weekday: "short" }) +
      "</div>" +
      '<div class="day-card__date">' +
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      "</div>" +
      '<div class="day-card__icon" title="' +
      weather.description +
      '">' +
      weather.emoji +
      "</div>" +
      '<div class="day-card__temps">' +
      '<span class="day-card__high">' +
      Math.round(daily.temperature_2m_max[i]) +
      "°</span>" +
      '<span class="day-card__low">' +
      Math.round(daily.temperature_2m_min[i]) +
      "°</span>" +
      "</div>";

    forecastGrid.appendChild(card);
  }

  forecastSection.hidden = false;
}

function renderMap(place) {
  const coords = [place.latitude, place.longitude];
  mapSection.hidden = false;

  if (!map) {
    map = L.map("map").setView(coords, 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  } else {
    map.setView(coords, 10);
  }

  if (marker) {
    marker.setLatLng(coords);
  } else {
    marker = L.marker(coords).addTo(map);
  }
  marker.bindPopup(formatPlace(place)).openPopup();

  // The container was hidden until now, so Leaflet may have measured it as 0x0.
  // Recompute its size once it's visible.
  setTimeout(function () {
    map.invalidateSize();
  }, 0);
}

// --- Status helpers ---
function setStatus(message, isError) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("status--error", Boolean(isError));
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "Loading…" : "Search";
}

// --- Main flow ---
async function searchCity(name) {
  setLoading(true);
  setStatus("Loading weather for " + name + "…", false);

  try {
    const place = await geocodeCity(name);
    const forecast = await getForecast(place.latitude, place.longitude);

    renderCurrent(forecast.current, place);
    renderMap(place);
    renderForecast(forecast.daily);
    setStatus("", false);
  } catch (err) {
    currentEl.hidden = true;
    mapSection.hidden = true;
    forecastSection.hidden = true;

    if (err instanceof CityNotFoundError) {
      setStatus('City "' + name + '" not found. Check the spelling and try again.', true);
    } else if (err instanceof TypeError) {
      // fetch throws TypeError on network failure / CORS / offline.
      setStatus("Network error. Please check your connection and try again.", true);
    } else {
      setStatus("Something went wrong: " + err.message, true);
    }
    console.error(err);
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = input.value.trim();
  if (!name) {
    setStatus("Please enter a city name.", true);
    return;
  }
  searchCity(name);
});

// Load a default city on first paint so the page isn't empty.
window.addEventListener("DOMContentLoaded", function () {
  input.value = "London";
  searchCity("London");
});
