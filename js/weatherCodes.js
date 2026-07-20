/* ==========================================================================
   WMO weather code -> human label + icon key
   Reference: open-meteo.com WMO Weather interpretation codes

   NOTE: This file is plain JavaScript using React.createElement (aliased to
   `h` below) instead of JSX. That avoids depending on an in-browser JSX
   compiler (Babel standalone), which some browsers block from fetching
   local files when this app is opened directly (file:// URLs). Plain JS
   works everywhere, no build step, no CDN dependency besides React itself.
   ========================================================================== */

var h = React.createElement;

var WEATHER_CODES = {
  0:  { label: "Clear sky",            icon: "clear" },
  1:  { label: "Mostly clear",         icon: "clear" },
  2:  { label: "Partly cloudy",        icon: "partly-cloudy" },
  3:  { label: "Overcast",             icon: "cloudy" },
  45: { label: "Fog",                  icon: "fog" },
  48: { label: "Rime fog",             icon: "fog" },
  51: { label: "Light drizzle",        icon: "drizzle" },
  53: { label: "Drizzle",              icon: "drizzle" },
  55: { label: "Dense drizzle",        icon: "drizzle" },
  56: { label: "Freezing drizzle",     icon: "drizzle" },
  57: { label: "Dense freezing drizzle", icon: "drizzle" },
  61: { label: "Light rain",           icon: "rain" },
  63: { label: "Rain",                 icon: "rain" },
  65: { label: "Heavy rain",           icon: "rain" },
  66: { label: "Freezing rain",        icon: "rain" },
  67: { label: "Heavy freezing rain",  icon: "rain" },
  71: { label: "Light snow",           icon: "snow" },
  73: { label: "Snow",                 icon: "snow" },
  75: { label: "Heavy snow",           icon: "snow" },
  77: { label: "Snow grains",          icon: "snow" },
  80: { label: "Light showers",        icon: "rain" },
  81: { label: "Showers",              icon: "rain" },
  82: { label: "Violent showers",      icon: "rain" },
  85: { label: "Snow showers",         icon: "snow" },
  86: { label: "Heavy snow showers",   icon: "snow" },
  95: { label: "Thunderstorm",         icon: "storm" },
  96: { label: "Thunderstorm, hail",   icon: "storm" },
  99: { label: "Severe thunderstorm",  icon: "storm" },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { label: "Unknown", icon: "cloudy" };
}

/* --------------------------------------------------------------------------
   Icon set - small, stroke-based SVGs, colored via fill so they read clearly
   on both the light and dark theme. `isDay` swaps clear/partly-cloudy to a
   moon at night.
   -------------------------------------------------------------------------- */
function WeatherIcon(props) {
  var code = props.code;
  var isDay = props.isDay === undefined ? 1 : props.isDay;
  var className = props.className || "";

  var icon = getWeatherInfo(code).icon;
  var sunColor = "#FFC978";
  var moonColor = "#CFD7EC";
  var cloudColor = "#E7ECF6";
  var rainColor = "#8FD3F4";

  var svgProps = { className: className, viewBox: "0 0 64 64", xmlns: "http://www.w3.org/2000/svg" };

  if (icon === "clear") {
    if (isDay) {
      return h("svg", svgProps,
        h("circle", { cx: 32, cy: 32, r: 14, fill: sunColor }),
        h("g", { stroke: sunColor, strokeWidth: 3, strokeLinecap: "round" },
          h("line", { x1: 32, y1: 4, x2: 32, y2: 11 }),
          h("line", { x1: 32, y1: 53, x2: 32, y2: 60 }),
          h("line", { x1: 4, y1: 32, x2: 11, y2: 32 }),
          h("line", { x1: 53, y1: 32, x2: 60, y2: 32 }),
          h("line", { x1: 12, y1: 12, x2: 17, y2: 17 }),
          h("line", { x1: 47, y1: 47, x2: 52, y2: 52 }),
          h("line", { x1: 12, y1: 52, x2: 17, y2: 47 }),
          h("line", { x1: 47, y1: 17, x2: 52, y2: 12 })
        )
      );
    }
    return h("svg", svgProps,
      h("path", { d: "M40 12a20 20 0 1 0 12 32 16 16 0 0 1-12-32z", fill: moonColor })
    );
  }

  if (icon === "partly-cloudy") {
    return h("svg", svgProps,
      h("circle", { cx: 24, cy: 24, r: 10, fill: sunColor }),
      h("path", { d: "M20 46a12 12 0 0 1-1-24 15 15 0 0 1 29 5 10 10 0 0 1-2 19H20z", fill: cloudColor })
    );
  }

  if (icon === "cloudy") {
    return h("svg", svgProps,
      h("path", { d: "M16 44a13 13 0 0 1 1-26 17 17 0 0 1 32 6 11 11 0 0 1-2 20H16z", fill: cloudColor }),
      h("path", { d: "M12 50a10 10 0 0 1 1-20 13 13 0 0 1 25 5 9 9 0 0 1-2 15H12z", fill: cloudColor, opacity: 0.7 })
    );
  }

  if (icon === "fog") {
    var fogLines = [34, 42, 50].map(function (y, i) {
      return h("line", { key: i, x1: 10, y1: y, x2: 54, y2: y, stroke: cloudColor, strokeWidth: 3, strokeLinecap: "round", opacity: 0.8 - i * 0.15 });
    });
    return h("svg", svgProps,
      h("path", { d: "M18 26a13 13 0 0 1 26 3 10 10 0 0 1-1 4H19a10 10 0 0 1-1-7z", fill: cloudColor }),
      fogLines
    );
  }

  if (icon === "drizzle" || icon === "rain") {
    var heavy = icon === "rain";
    var drops = [22, 32, 42].map(function (x, i) {
      return h("line", { key: i, x1: x, y1: 40, x2: x - (heavy ? 5 : 3), y2: heavy ? 58 : 52, stroke: rainColor, strokeWidth: 3, strokeLinecap: "round" });
    });
    return h("svg", svgProps,
      h("path", { d: "M16 32a12 12 0 0 1 1-24 15 15 0 0 1 29 5 10 10 0 0 1-2 19H16z", fill: cloudColor }),
      drops
    );
  }

  if (icon === "snow") {
    var flakes = [22, 32, 42].map(function (x, i) {
      return h("g", { key: i, stroke: "#fff", strokeWidth: 2.4, strokeLinecap: "round" },
        h("line", { x1: x, y1: 42, x2: x, y2: 54 }),
        h("line", { x1: x - 5, y1: 48, x2: x + 5, y2: 48 })
      );
    });
    return h("svg", svgProps,
      h("path", { d: "M16 30a12 12 0 0 1 1-24 15 15 0 0 1 29 5 10 10 0 0 1-2 19H16z", fill: cloudColor }),
      flakes
    );
  }

  if (icon === "storm") {
    return h("svg", svgProps,
      h("path", { d: "M16 28a12 12 0 0 1 1-24 15 15 0 0 1 29 5 10 10 0 0 1-2 19H16z", fill: cloudColor }),
      h("polygon", { points: "34,36 24,52 32,52 28,62 44,44 35,44", fill: sunColor })
    );
  }

  return h("svg", svgProps, h("circle", { cx: 32, cy: 32, r: 10, fill: cloudColor }));
}

/* Compass direction from degrees */
function degToCompass(deg) {
  var dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function aqiColor(aqi) {
  if (aqi == null) return "#B9C6E0";
  if (aqi <= 50) return "#7de37d";
  if (aqi <= 100) return "#ffe066";
  if (aqi <= 150) return "#ffb347";
  if (aqi <= 200) return "#ff6b6b";
  if (aqi <= 300) return "#b06bff";
  return "#7a1f3d";
}
function aqiLabel(aqi) {
  if (aqi == null) return "\u2014";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}
