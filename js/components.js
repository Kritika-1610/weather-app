/* ==========================================================================
   Presentational React components for Skyline.
   Plain JavaScript (React.createElement, aliased `h`) instead of JSX -- see
   the note at the top of weatherCodes.js for why.
   ========================================================================== */

var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;

/* ==========================================================================
   Sky backdrop -- signature element. Computes a "phase" (night/dawn/day/dusk)
   from the viewed city's real local time + sunrise/sunset, then renders a
   drifting cloud/star field and a sun or moon positioned along an arc.
   ========================================================================== */
function skyPhase(localHour, sunriseHour, sunsetHour) {
  var dawnStart = sunriseHour - 0.75, dawnEnd = sunriseHour + 0.75;
  var duskStart = sunsetHour - 0.75, duskEnd = sunsetHour + 0.75;
  if (localHour >= dawnStart && localHour <= dawnEnd) return "dawn";
  if (localHour >= duskStart && localHour <= duskEnd) return "dusk";
  if (localHour > dawnEnd && localHour < duskStart) return "day";
  return "night";
}

function CloudShape() {
  return h("svg", { viewBox: "0 0 200 90", xmlns: "http://www.w3.org/2000/svg" },
    h("ellipse", { cx: 60, cy: 55, rx: 55, ry: 30, fill: "#ffffff" }),
    h("ellipse", { cx: 110, cy: 40, rx: 45, ry: 35, fill: "#ffffff" }),
    h("ellipse", { cx: 150, cy: 58, rx: 40, ry: 26, fill: "#ffffff" })
  );
}

function SkyBackdrop(props) {
  var localHour = props.localHour, sunriseHour = props.sunriseHour, sunsetHour = props.sunsetHour, weatherIcon = props.weatherIcon;

  var phase = useMemo(function () {
    if (sunriseHour == null) return (localHour >= 6 && localHour <= 18) ? "day" : "night";
    return skyPhase(localHour, sunriseHour, sunsetHour);
  }, [localHour, sunriseHour, sunsetHour]);

  var dayLen = (sunsetHour != null ? sunsetHour : 18) - (sunriseHour != null ? sunriseHour : 6);
  var progress = sunriseHour == null ? 0.5 : Math.min(Math.max((localHour - sunriseHour) / (dayLen || 1), -0.15), 1.15);
  var showSun = phase !== "night";
  var arcX = 8 + progress * 84;
  var arcY = 62 - Math.sin(Math.max(Math.min(progress, 1), 0) * Math.PI) * 46;

  var stars = useMemo(function () {
    var arr = [];
    for (var i = 0; i < 46; i++) {
      arr.push({ id: i, top: Math.random() * 60, left: Math.random() * 100, delay: Math.random() * 3.4, size: Math.random() < 0.15 ? 3 : 2 });
    }
    return arr;
  }, []);

  var clouds = useMemo(function () {
    var arr = [];
    for (var i = 0; i < 5; i++) {
      arr.push({ id: i, top: 8 + Math.random() * 34, scale: 0.6 + Math.random() * 0.9, duration: 60 + Math.random() * 60, delay: -Math.random() * 60 });
    }
    return arr;
  }, []);

  var showRain = weatherIcon === "rain" || weatherIcon === "drizzle" || weatherIcon === "storm";
  var showSnow = weatherIcon === "snow";

  var starEls = stars.map(function (s) {
    return h("div", { key: s.id, className: "star", style: { top: s.top + "%", left: s.left + "%", width: s.size, height: s.size, animationDelay: s.delay + "s" } });
  });

  var cloudEls = clouds.map(function (c) {
    return h("div", { key: c.id, className: "cloud", style: { top: c.top + "%", width: (28 * c.scale) + "vw", maxWidth: 340, animationDuration: c.duration + "s", animationDelay: c.delay + "s" } },
      h(CloudShape)
    );
  });

  var rainDrops = null;
  if (showRain) {
    var drops = [];
    for (var i = 0; i < 40; i++) {
      drops.push(h("span", { key: i, className: "drop", style: { left: (Math.random() * 100) + "%", animationDuration: (0.5 + Math.random() * 0.5) + "s", animationDelay: (Math.random() * 2) + "s" } }));
    }
    rainDrops = h("div", { className: "rain-field" }, drops);
  }

  var snowFlakes = null;
  if (showSnow) {
    var flakes = [];
    for (var j = 0; j < 34; j++) {
      var size = 3 + Math.random() * 3;
      flakes.push(h("span", { key: j, className: "flake", style: { left: (Math.random() * 100) + "%", width: size, height: size, animationDuration: (4 + Math.random() * 4) + "s", animationDelay: (Math.random() * 4) + "s" } }));
    }
    snowFlakes = h("div", { className: "snow-field" }, flakes);
  }

  var opacity = sunriseHour == null ? 1 : ((progress < -0.1 || progress > 1.1) ? 0 : 1);

  return h("div", { className: "sky-backdrop phase-" + phase, "aria-hidden": "true" },
    h("div", { className: "stars" }, starEls),
    h("div", { className: "celestial-body", style: { left: arcX + "vw", top: arcY + "vh", opacity: opacity } },
      h("div", { className: showSun ? "celestial-body sun" : "celestial-body moon", style: { position: "static" } })
    ),
    h("div", { className: "cloud-field" }, cloudEls),
    rainDrops,
    snowFlakes
  );
}

/* ==========================================================================
   Search bar with live geocoding suggestions
   ========================================================================== */
function SearchBar(props) {
  var onSelectPlace = props.onSelectPlace, onUseLocation = props.onUseLocation, locating = props.locating;

  var queryState = useState("");
  var query = queryState[0], setQuery = queryState[1];
  var resultsState = useState([]);
  var results = resultsState[0], setResults = resultsState[1];
  var openState = useState(false);
  var open = openState[0], setOpen = openState[1];
  var debounceRef = useRef(null);
  var wrapRef = useRef(null);

  useEffect(function () {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(function () {
      searchCities(query).then(function (r) {
        setResults(r);
        setOpen(true);
      }).catch(function () {
        setResults([]);
      });
    }, 350);
    return function () { clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(function () {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return function () { document.removeEventListener("mousedown", onClickOutside); };
  }, []);

  function pick(place) {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelectPlace(place);
  }

  var resultEls = results.map(function (r) {
    return h("div", { key: r.id, className: "search-result-item", onClick: function () { pick(r); } },
      h("span", { className: "city" }, r.name),
      h("span", { className: "region" }, [r.admin1, r.country].filter(Boolean).join(", "))
    );
  });

  return h("div", { className: "search-wrap", ref: wrapRef },
    h("div", { className: "search-bar" },
      h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
        h("circle", { cx: 11, cy: 11, r: 7 }),
        h("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
      ),
      h("input", {
        type: "text",
        placeholder: "Search any city \u2014 Tokyo, Meerut, S\u00e3o Paulo\u2026",
        value: query,
        onChange: function (e) { setQuery(e.target.value); },
        onFocus: function () { if (results.length) setOpen(true); },
        onKeyDown: function (e) { if (e.key === "Enter" && results[0]) pick(results[0]); }
      }),
      h("button", { className: "locate-btn", title: "Use my location", onClick: onUseLocation, disabled: locating },
        locating
          ? h("svg", { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 2 },
              h("circle", { cx: 12, cy: 12, r: 9, strokeDasharray: 42, strokeDashoffset: 14 })
            )
          : h("svg", { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
              h("circle", { cx: 12, cy: 12, r: 3 }),
              h("path", { d: "M12 2v3M12 19v3M2 12h3M19 12h3" })
            )
      )
    ),
    (open && results.length > 0) ? h("div", { className: "search-results" }, resultEls) : null
  );
}

/* ==========================================================================
   Favorite / recent city chips
   ========================================================================== */
function FavoritesRow(props) {
  var favorites = props.favorites, activeId = props.activeId, onSelect = props.onSelect, onRemove = props.onRemove;
  if (!favorites.length) return null;
  var chips = favorites.map(function (f) {
    return h("div", { key: f.id, className: "chip" + (f.id === activeId ? " active" : ""), onClick: function () { onSelect(f); } },
      h("span", null, f.name),
      h("span", { className: "remove", onClick: function (e) { e.stopPropagation(); onRemove(f.id); } }, "\u00d7")
    );
  });
  return h("div", { className: "favorites-row" }, chips);
}

/* ==========================================================================
   Sun arc -- sunrise, sunset, and a curve showing where we are right now
   ========================================================================== */
function SunArcCard(props) {
  var sunrise = props.sunrise, sunset = props.sunset, nowLocal = props.nowLocal, formatTime = props.formatTime;
  if (!sunrise || !sunset) return null;

  var sunriseH = sunrise.getHours() + sunrise.getMinutes() / 60;
  var sunsetH = sunset.getHours() + sunset.getMinutes() / 60;
  var nowH = nowLocal.getHours() + nowLocal.getMinutes() / 60;
  var span = sunsetH - sunriseH || 12;
  var t = Math.min(Math.max((nowH - sunriseH) / span, 0), 1);

  var w = 600, hh = 90, pad = 30;
  var x = pad + t * (w - pad * 2);
  var y = hh - 12 - Math.sin(t * Math.PI) * (hh - 40);
  var pathD = "M " + pad + " " + (hh - 12) + " Q " + (w / 2) + " -6 " + (w - pad) + " " + (hh - 12);

  return h("div", { className: "sun-card" },
    h("div", { className: "sun-card-head" },
      h("span", { className: "title" }, "Sun today"),
      h("span", { className: "times" }, "\u2191 " + formatTime(sunrise) + " \u00b7 \u2193 " + formatTime(sunset))
    ),
    h("svg", { className: "sun-arc-svg", viewBox: "0 0 " + w + " " + hh, preserveAspectRatio: "none" },
      h("path", { d: pathD, fill: "none", stroke: "var(--surface-strong)", strokeWidth: 2, strokeDasharray: "4 6" }),
      h("circle", { cx: x, cy: y, r: 7, fill: "var(--gold)" }),
      h("circle", { cx: pad, cy: hh - 12, r: 3, fill: "var(--mist)" }),
      h("circle", { cx: w - pad, cy: hh - 12, r: 3, fill: "var(--mist)" })
    )
  );
}

/* ==========================================================================
   Hourly forecast strip
   ========================================================================== */
function HourlyStrip(props) {
  var hourly = props.hourly, formatTime = props.formatTime;
  if (!hourly) return null;
  var now = Date.now();
  var items = hourly.time.map(function (t, i) {
    return { time: new Date(t), temp: hourly.temperature_2m[i], code: hourly.weather_code[i], pop: hourly.precipitation_probability ? hourly.precipitation_probability[i] : null };
  }).filter(function (hh) { return hh.time.getTime() >= now - 3600 * 1000; }).slice(0, 24);

  var cards = items.map(function (hh, i) {
    return h("div", { className: "hour-card", key: i },
      h("div", { className: "hour-label" }, i === 0 ? "Now" : formatTime(hh.time)),
      h(WeatherIcon, { code: hh.code, isDay: 1 }),
      h("div", { className: "hour-temp" }, Math.round(hh.temp) + "\u00b0"),
      hh.pop != null ? h("div", { className: "hour-pop" }, hh.pop + "%") : null
    );
  });

  return h("div", null,
    h("div", { className: "section-title" }, "Next 24 hours"),
    h("div", { className: "hourly-strip" }, cards)
  );
}

/* ==========================================================================
   Daily (7-day) forecast list
   ========================================================================== */
function DailyList(props) {
  var daily = props.daily;
  if (!daily) return null;
  var globalMin = Math.min.apply(null, daily.temperature_2m_min);
  var globalMax = Math.max.apply(null, daily.temperature_2m_max);
  var span = globalMax - globalMin || 1;

  var rows = daily.time.map(function (t, i) {
    var date = new Date(t);
    var dayName = i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" });
    var dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    var lo = daily.temperature_2m_min[i], hi = daily.temperature_2m_max[i];
    var left = ((lo - globalMin) / span) * 100;
    var width = Math.max(((hi - lo) / span) * 100, 8);
    var pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;

    return h("div", { className: "daily-row", key: t },
      h("div", null,
        h("div", { className: "day-name" }, dayName),
        h("div", { className: "day-date" }, dateStr)
      ),
      h(WeatherIcon, { code: daily.weather_code[i], isDay: 1 }),
      h("div", { className: "pop" }, (pop != null ? pop : 0) + "%"),
      h("div", { className: "temp-range" },
        h("span", { className: "lo" }, Math.round(lo) + "\u00b0"),
        h("div", { className: "range-bar" }, h("div", { className: "fill", style: { left: left + "%", width: width + "%" } })),
        h("span", { className: "hi" }, Math.round(hi) + "\u00b0")
      )
    );
  });

  return h("div", null,
    h("div", { className: "section-title" }, "7-day forecast"),
    h("div", { className: "daily-list" }, rows)
  );
}

/* ==========================================================================
   Insight cards: UV index, air quality, wind compass
   ========================================================================== */
function uvLabel(uv) {
  if (uv == null) return "\u2014";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

function InsightGrid(props) {
  var uvIndex = props.uvIndex, air = props.air, windSpeed = props.windSpeed, windDir = props.windDir, windGust = props.windGust, unitLabel = props.unitLabel;
  var uvPct = Math.min(Math.max((uvIndex || 0) / 11, 0), 1) * 100;
  var aqi = (air && air.current) ? air.current.us_aqi : null;

  return h("div", { className: "insight-grid" },
    h("div", { className: "insight-card" },
      h("div", { className: "title" }, "UV Index"),
      h("div", { className: "big-value" }, uvIndex != null ? Math.round(uvIndex) : "\u2014"),
      h("div", { className: "caption" }, uvLabel(uvIndex)),
      h("div", { className: "uv-bar" }, h("div", { className: "uv-marker", style: { left: uvPct + "%" } }))
    ),
    h("div", { className: "insight-card" },
      h("div", { className: "title" }, "Air quality"),
      h("div", { className: "big-value", style: { color: aqiColor(aqi) } }, aqi != null ? aqi : "\u2014"),
      h("div", { className: "caption" }, h("span", { className: "aqi-dot", style: { "--aqi-color": aqiColor(aqi) } }), aqiLabel(aqi)),
      (air && air.current) ? h("div", { className: "caption", style: { marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11.5 } },
        "PM2.5 " + Math.round(air.current.pm2_5) + " \u00b7 O\u2083 " + Math.round(air.current.ozone)
      ) : null
    ),
    h("div", { className: "insight-card" },
      h("div", { className: "title" }, "Wind"),
      h("div", { className: "big-value" }, Math.round(windSpeed), h("span", { style: { fontSize: 16 } }, " " + unitLabel)),
      h("div", { className: "caption" }, "Gusts " + Math.round(windGust) + " " + unitLabel),
      h("div", { className: "compass" },
        h("svg", { viewBox: "0 0 76 76" },
          h("circle", { cx: 38, cy: 38, r: 34, fill: "none", stroke: "var(--surface-strong)", strokeWidth: 2 }),
          h("text", { x: 38, y: 12, textAnchor: "middle", fontSize: 9, fill: "var(--text-tertiary)" }, "N"),
          h("text", { x: 38, y: 70, textAnchor: "middle", fontSize: 9, fill: "var(--text-tertiary)" }, "S"),
          h("text", { x: 8, y: 41, textAnchor: "middle", fontSize: 9, fill: "var(--text-tertiary)" }, "W"),
          h("text", { x: 68, y: 41, textAnchor: "middle", fontSize: 9, fill: "var(--text-tertiary)" }, "E"),
          h("g", { className: "needle", style: { transform: "rotate(" + windDir + "deg)" } },
            h("line", { x1: 38, y1: 38, x2: 38, y2: 14, stroke: "var(--coral)", strokeWidth: 3, strokeLinecap: "round" }),
            h("circle", { cx: 38, cy: 38, r: 3.5, fill: "var(--coral)" })
          )
        )
      )
    )
  );
}

/* ==========================================================================
   Empty / error / loading state panels
   ========================================================================== */
function StatePanel(props) {
  var kind = props.kind, message = props.message, onRetry = props.onRetry;

  if (kind === "loading") {
    return h("div", { className: "state-panel" },
      h("div", { className: "skeleton-shimmer", style: { width: 220, height: 220, borderRadius: "50%" } }),
      h("p", null, "Reading the sky\u2026")
    );
  }
  if (kind === "error") {
    return h("div", { className: "state-panel" },
      h("div", { className: "state-icon" }, "\u26c8"),
      h("h2", null, "That didn't come through"),
      h("p", null, message || "Something went wrong fetching the forecast."),
      onRetry ? h("button", { className: "chip", onClick: onRetry }, "Try again") : null
    );
  }
  return h("div", { className: "state-panel" },
    h("div", { className: "state-icon" }, "\u2601\ufe0e"),
    h("h2", null, "Where's the sky today?"),
    h("p", null, "Search a city above, or share your location, to see the current conditions and forecast.")
  );
}
