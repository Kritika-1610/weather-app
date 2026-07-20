/* ==========================================================================
   Main App component -- state, data fetching, layout composition.
   Plain JavaScript (React.createElement, aliased `h`) instead of JSX -- see
   the note at the top of weatherCodes.js for why.
   ========================================================================== */

var FAVORITES_KEY = "skyline.favorites";
var LAST_PLACE_KEY = "skyline.lastPlace";
var UNIT_KEY = "skyline.unit";
var THEME_KEY = "skyline.theme";

function loadJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable -- app still works */ }
}

function App() {
  var placeState = useState(function () { return loadJSON(LAST_PLACE_KEY, null); });
  var place = placeState[0], setPlace = placeState[1];

  var forecastState = useState(null);
  var forecast = forecastState[0], setForecast = forecastState[1];

  var airState = useState(null);
  var air = airState[0], setAir = airState[1];

  var statusState = useState(place ? "loading" : "empty");
  var status = statusState[0], setStatus = statusState[1];

  var errorMsgState = useState("");
  var errorMsg = errorMsgState[0], setErrorMsg = errorMsgState[1];

  var unitState = useState(function () { return loadJSON(UNIT_KEY, "celsius"); });
  var unit = unitState[0], setUnit = unitState[1];

  var themeState = useState(function () { return loadJSON(THEME_KEY, "dark"); });
  var theme = themeState[0], setTheme = themeState[1];

  var favoritesState = useState(function () { return loadJSON(FAVORITES_KEY, []); });
  var favorites = favoritesState[0], setFavorites = favoritesState[1];

  var locatingState = useState(false);
  var locating = locatingState[0], setLocating = locatingState[1];

  var tickState = useState(0);
  var tick = tickState[0], setTick = tickState[1];

  useEffect(function () {
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add("theme-" + theme);
    saveJSON(THEME_KEY, theme);
  }, [theme]);

  useEffect(function () { saveJSON(UNIT_KEY, unit); }, [unit]);
  useEffect(function () { saveJSON(FAVORITES_KEY, favorites); }, [favorites]);
  useEffect(function () { if (place) saveJSON(LAST_PLACE_KEY, place); }, [place]);

  useEffect(function () {
    if (!place) return;
    var cancelled = false;
    setStatus("loading");
    setErrorMsg("");

    Promise.all([
      fetchForecast(place.latitude, place.longitude, unit),
      fetchAirQuality(place.latitude, place.longitude)
    ]).then(function (results) {
      if (cancelled) return;
      setForecast(results[0]);
      setAir(results[1]);
      setStatus("ready");
    }).catch(function (e) {
      if (cancelled) return;
      setErrorMsg((e && e.message) || "Couldn't load the forecast.");
      setStatus("error");
    });

    return function () { cancelled = true; };
  }, [place, unit, tick]);

  function handleSelectPlace(p) {
    setPlace(p);
  }

  function handleUseLocation() {
    setLocating(true);
    getBrowserLocation().then(function (coords) {
      setPlace(coordsToPlace(coords.latitude, coords.longitude));
    }).catch(function () {
      setErrorMsg("Couldn't get your location \u2014 check browser permissions, or search a city instead.");
      setStatus("error");
    }).finally(function () {
      setLocating(false);
    });
  }

  function toggleFavorite() {
    if (!place) return;
    setFavorites(function (prev) {
      var exists = prev.some(function (f) { return f.id === place.id; });
      if (exists) return prev;
      return prev.concat([place]).slice(-8);
    });
  }
  function removeFavorite(id) {
    setFavorites(function (prev) { return prev.filter(function (f) { return f.id !== id; }); });
  }

  var isFavorite = place && favorites.some(function (f) { return f.id === place.id; });
  var unitLabel = unit === "fahrenheit" ? "\u00b0F" : "\u00b0C";
  var windUnitLabel = unit === "fahrenheit" ? "mph" : "km/h";

  var nowLocal = useMemo(function () {
    if (!forecast || !forecast.current) return new Date();
    return new Date(forecast.current.time);
  }, [forecast]);

  function formatTime(d) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  var sunrise = (forecast && forecast.daily && forecast.daily.sunrise && forecast.daily.sunrise[0]) ? new Date(forecast.daily.sunrise[0]) : null;
  var sunset = (forecast && forecast.daily && forecast.daily.sunset && forecast.daily.sunset[0]) ? new Date(forecast.daily.sunset[0]) : null;
  var weatherIconKey = forecast ? getWeatherInfo(forecast.current.weather_code).icon : "clear";
  var localHour = nowLocal.getHours() + nowLocal.getMinutes() / 60;
  var sunriseHour = sunrise ? sunrise.getHours() + sunrise.getMinutes() / 60 : null;
  var sunsetHour = sunset ? sunset.getHours() + sunset.getMinutes() / 60 : null;

  // ---- Header -------------------------------------------------------------
  var header = h("header", { className: "topbar" },
    h("div", { className: "brand" },
      h("div", { className: "brand-mark" },
        h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#171625", strokeWidth: 2.4, strokeLinecap: "round" },
          h("circle", { cx: 12, cy: 12, r: 4 }),
          h("path", { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" })
        )
      ),
      h("span", { className: "brand-name" }, "Skyline"),
      h("span", { className: "brand-tag" }, "live sky forecast")
    ),
    h("div", { className: "topbar-controls" },
      h("div", { className: "unit-toggle" },
        h("button", { className: unit === "celsius" ? "active" : "", onClick: function () { setUnit("celsius"); } }, "\u00b0C"),
        h("button", { className: unit === "fahrenheit" ? "active" : "", onClick: function () { setUnit("fahrenheit"); } }, "\u00b0F")
      ),
      h("button", { className: "icon-btn", title: "Toggle theme", onClick: function () { setTheme(function (t) { return t === "dark" ? "light" : "dark"; }); } },
        theme === "dark"
          ? h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
              h("circle", { cx: 12, cy: 12, r: 4 }),
              h("path", { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" })
            )
          : h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
              h("path", { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" })
            )
      ),
      place ? h("button", { className: "icon-btn", title: isFavorite ? "Saved" : "Save city", onClick: toggleFavorite },
        h("svg", { viewBox: "0 0 24 24", fill: isFavorite ? "currentColor" : "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" },
          h("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })
        )
      ) : null
    )
  );

  // ---- Main content (only once forecast is ready) -------------------------
  var readyContent = null;
  if (status === "ready" && forecast) {
    var heroCard = h("section", { className: "hero-card" },
      h("div", { className: "hero-main" },
        h("div", { className: "hero-location" },
          h("h1", null, place.name),
          (place.admin1 || place.country) ? h("span", { className: "region" }, [place.admin1, place.country].filter(Boolean).join(", ")) : null
        ),
        h("div", { className: "hero-time" },
          nowLocal.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + " \u00b7 " + formatTime(nowLocal) + " local time"
        ),
        h("div", { className: "hero-temp-row" },
          h("div", { className: "hero-temp" }, Math.round(forecast.current.temperature_2m) + "\u00b0"),
          h("div", null, h(WeatherIcon, { code: forecast.current.weather_code, isDay: forecast.current.is_day, className: "hero-icon" }))
        ),
        h("div", { className: "hero-desc" }, getWeatherInfo(forecast.current.weather_code).label),
        h("div", { className: "hero-feels" },
          "Feels like " + Math.round(forecast.current.apparent_temperature) + unitLabel + " \u00b7 Humidity " + forecast.current.relative_humidity_2m + "%"
        )
      ),
      h("div", { className: "hero-stats" },
        h("div", { className: "stat-tile" },
          h("div", { className: "label" },
            h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 }, h("path", { d: "M12 3v10m0 0a4 4 0 1 0 4 4" }), h("circle", { cx: 12, cy: 17, r: 1 })),
            "Feels like"
          ),
          h("div", { className: "value" }, Math.round(forecast.current.apparent_temperature) + unitLabel)
        ),
        h("div", { className: "stat-tile" },
          h("div", { className: "label" },
            h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 }, h("path", { d: "M12 2s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z" })),
            "Humidity"
          ),
          h("div", { className: "value" }, forecast.current.relative_humidity_2m + "%")
        ),
        h("div", { className: "stat-tile" },
          h("div", { className: "label" },
            h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 }, h("path", { d: "M2 12h13a3 3 0 1 0-3-3M2 17h9a3 3 0 1 1-3 3M2 7h17a3 3 0 1 0-3-3" })),
            "Wind"
          ),
          h("div", { className: "value" }, Math.round(forecast.current.wind_speed_10m) + " " + windUnitLabel),
          h("div", { className: "sub" }, degToCompass(forecast.current.wind_direction_10m))
        ),
        h("div", { className: "stat-tile" },
          h("div", { className: "label" },
            h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 }, h("path", { d: "M3 12h4l3-8 4 16 3-8h4" })),
            "Pressure"
          ),
          h("div", { className: "value" }, Math.round(forecast.current.surface_pressure)),
          h("div", { className: "sub" }, "hPa")
        )
      )
    );

    readyContent = h(React.Fragment, null,
      heroCard,
      h(SunArcCard, { sunrise: sunrise, sunset: sunset, nowLocal: nowLocal, formatTime: formatTime }),
      h(HourlyStrip, { hourly: forecast.hourly, unit: unit, formatTime: formatTime }),
      h(InsightGrid, {
        uvIndex: forecast.daily.uv_index_max ? forecast.daily.uv_index_max[0] : null,
        air: air,
        windSpeed: forecast.current.wind_speed_10m,
        windDir: forecast.current.wind_direction_10m,
        windGust: forecast.current.wind_gusts_10m,
        unitLabel: windUnitLabel
      }),
      h(DailyList, { daily: forecast.daily, unitLabel: unitLabel })
    );
  }

  return h(React.Fragment, null,
    h(SkyBackdrop, { localHour: localHour, sunriseHour: sunriseHour, sunsetHour: sunsetHour, weatherIcon: weatherIconKey }),
    h("div", { className: "app-shell" },
      header,
      h(SearchBar, { onSelectPlace: handleSelectPlace, onUseLocation: handleUseLocation, locating: locating }),
      h(FavoritesRow, { favorites: favorites, activeId: place ? place.id : null, onSelect: handleSelectPlace, onRemove: removeFavorite }),
      status === "empty" ? h(StatePanel, { kind: "empty" }) : null,
      status === "loading" ? h(StatePanel, { kind: "loading" }) : null,
      status === "error" ? h(StatePanel, { kind: "error", message: errorMsg, onRetry: function () { setTick(function (t) { return t + 1; }); } }) : null,
      readyContent,
      h("footer", { className: "app-footer" },
        "Weather data from ",
        h("a", { href: "https://open-meteo.com", target: "_blank", rel: "noreferrer" }, "Open-Meteo"),
        " \u00b7 Skyline shows every place in its own local time."
      )
    )
  );
}

var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));
