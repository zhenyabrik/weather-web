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

// --- DOM references ---
const countrySelect = document.getElementById("country-select");
const citySelect = document.getElementById("city-select");
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
  countrySelect.disabled = isLoading;
  // Keep the city select disabled while loading; re-enable only if a country is chosen.
  citySelect.disabled = isLoading || !countrySelect.value;
}

// --- Main flow ---
async function showWeatherFor(place) {
  setLoading(true);
  setStatus("Loading weather for " + place.name + "…", false);

  try {
    const forecast = await getForecast(place.latitude, place.longitude);

    renderCurrent(forecast.current, place);
    renderMap(place);
    renderForecast(forecast.daily);
    setStatus("", false);
  } catch (err) {
    currentEl.hidden = true;
    mapSection.hidden = true;
    forecastSection.hidden = true;

    if (err instanceof TypeError) {
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

// --- Populate the dropdowns ---
function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function populateCountries() {
  Object.keys(LOCATIONS).forEach(function (country) {
    addOption(countrySelect, country, country);
  });
}

function populateCities(country) {
  // Reset to just the placeholder, then add the country's cities.
  citySelect.length = 1;
  citySelect.selectedIndex = 0;

  const cities = LOCATIONS[country] || [];
  cities.forEach(function (city, index) {
    addOption(citySelect, String(index), city.name);
  });
  citySelect.disabled = cities.length === 0;
}

countrySelect.addEventListener("change", function () {
  populateCities(countrySelect.value);
  // No city chosen yet; clear any previously shown weather.
  setStatus("Now pick a city.", false);
  currentEl.hidden = true;
  mapSection.hidden = true;
  forecastSection.hidden = true;
});

citySelect.addEventListener("change", function () {
  const country = countrySelect.value;
  const city = LOCATIONS[country] && LOCATIONS[country][Number(citySelect.value)];
  if (!city) return;

  showWeatherFor({
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    country: country,
  });
});

// --- Exchange rates widget ---
// Coinbase public spot-price API (no key). Pair format matches "BTC-USD".
// A pair Coinbase doesn't list gracefully shows "n/a".
const RATE_PAIRS = ["BTC-USD", "ETH-USD"];
const ratesList = document.getElementById("rates-list");
const ratesUpdated = document.getElementById("rates-updated");

async function fetchSpotPrice(pair) {
  const res = await fetch("https://api.coinbase.com/v2/prices/" + pair + "/spot");
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data.data.amount; // string, e.g. "62289.025"
}

function formatUsd(amount) {
  return Number(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function buildRatesRows() {
  ratesList.innerHTML = "";
  RATE_PAIRS.forEach(function (pair) {
    const li = document.createElement("li");
    li.className = "rate";
    li.innerHTML =
      '<span class="rate__pair">' +
      pair +
      '</span><span class="rate__price" data-pair="' +
      pair +
      '">…</span>';
    ratesList.appendChild(li);
  });
}

async function loadRates() {
  await Promise.all(
    RATE_PAIRS.map(async function (pair) {
      const priceEl = ratesList.querySelector('[data-pair="' + pair + '"]');
      if (!priceEl) return;
      try {
        const amount = await fetchSpotPrice(pair);
        priceEl.textContent = formatUsd(amount);
        priceEl.classList.remove("rate__price--na");
      } catch (err) {
        priceEl.textContent = "n/a";
        priceEl.classList.add("rate__price--na");
      }
    })
  );
  ratesUpdated.textContent = "Updated " + new Date().toLocaleTimeString("en-US");
}

window.addEventListener("DOMContentLoaded", function () {
  buildRatesRows();
  loadRates();
  buildStocksRows();
  loadStocks();
  // Refresh prices every 60 seconds.
  setInterval(loadRates, 60000);
  setInterval(loadStocks, 60000);
});

// --- Stocks widget ---
// Yahoo Finance public chart endpoint (no API key required).
// SpaceX is a private company — displayed as "Private".
const STOCK_TICKERS = [
  { symbol: "MSFT",  label: "MSFT"   },
  { symbol: "TSLA",  label: "Tesla"  },
  { symbol: null,    label: "SpaceX", isPrivate: true },
  { symbol: "AMZN",  label: "Amazon" },
];

const stocksList    = document.getElementById("stocks-list");
const stocksUpdated = document.getElementById("stocks-updated");

async function fetchStockPrice(symbol) {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
      symbol +
      "?interval=1d&range=1d"
  );
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data.chart.result[0].meta.regularMarketPrice;
}

function buildStocksRows() {
  stocksList.innerHTML = "";
  STOCK_TICKERS.forEach(function (stock) {
    const li = document.createElement("li");
    li.className = "rate";
    if (stock.isPrivate) {
      li.innerHTML =
        '<span class="rate__pair">' + stock.label + "</span>" +
        '<span class="rate__price stock__price--private">Private</span>';
    } else {
      li.innerHTML =
        '<span class="rate__pair">' + stock.label + "</span>" +
        '<span class="rate__price" data-stock="' + stock.symbol + '">…</span>';
    }
    stocksList.appendChild(li);
  });
}

async function loadStocks() {
  await Promise.all(
    STOCK_TICKERS.filter(function (s) { return !s.isPrivate; }).map(async function (stock) {
      const priceEl = stocksList.querySelector('[data-stock="' + stock.symbol + '"]');
      if (!priceEl) return;
      try {
        const price = await fetchStockPrice(stock.symbol);
        priceEl.textContent = formatUsd(price);
        priceEl.classList.remove("rate__price--na");
      } catch (err) {
        priceEl.textContent = "n/a";
        priceEl.classList.add("rate__price--na");
      }
    })
  );
  stocksUpdated.textContent = "Updated " + new Date().toLocaleTimeString("en-US");
}

// On first paint: fill the country list and preselect a default location.
window.addEventListener("DOMContentLoaded", function () {
  populateCountries();

  const defaultCountry = "Hungary";
  const defaultCityName = "Budapest";
  countrySelect.value = defaultCountry;
  populateCities(defaultCountry);

  const cityIndex = LOCATIONS[defaultCountry].findIndex(function (c) {
    return c.name === defaultCityName;
  });
  if (cityIndex >= 0) {
    citySelect.value = String(cityIndex);
    const city = LOCATIONS[defaultCountry][cityIndex];
    showWeatherFor({
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      country: defaultCountry,
    });
  }
});
