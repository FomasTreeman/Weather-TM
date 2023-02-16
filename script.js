// * ------------- fetchers
let weatherFetches = 0;
let fetches = 0;

async function fetchResult(
  url,
  init,
  errorHandler = (url) => {
    throw new Error("invalid request: " + url);
  }
) {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!json.result) {
    errorHandler(url);
  }
  return json.result;
}

async function fetchWeather(postcode) {
  try {
    const validateResult = await fetchResult(
      `https://api.postcodes.io/postcodes/${postcode}/validate`
    );
    if (!validateResult) throw new Error("Invalid postcode");
    const { longitude, latitude } = await fetchResult(
      `https://api.postcodes.io/postcodes/${postcode}`
    );

    let url = new URL(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
    );
    let params = new URLSearchParams(url.search);
    params.append("current_weather", true);
    params.append("timezone", "GMT");
    params.append("daily", "weathercode");
    params.append("daily", "precipitation_sum");
    params.append("daily", "windspeed_10m_max");
    params.append("daily", "apparent_temperature_max");
    params.append("hourly", "relativehumidity_2m");
    params.append("hourly", "temperature_2m");
    params.append("hourly", "precipitation");
    params.append("hourly", "windspeed_10m");

    const response = await fetch(url + params);
    const json = await response.json();
    fetches++;
    return json;
  } catch (error) {
    // TODO improve error handling to give user feedback
    alert(error);
  }
}

async function fetchPostcode(latitude, longitude) {
  const body = {
    geolocations: [
      {
        longitude: longitude,
        latitude: latitude,
        widesearch: true,
        limit: 1,
      },
    ],
  };
  const url = "https://api.postcodes.io/postcodes";
  const result = await fetchResult(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
  if (!result[0].result) return null;

  return result[0].result[0].postcode;
}

async function fetchAndRenderSuggestion(inputElement) {
  let searchValue = inputElement.target.value.trim();
  try {
    const handleNoResult = () => {
      hide("#autocomplete");

      // throw new Error("starting characters have no similar postcodes");
    };
    const result = await fetchResult(
      `https://api.postcodes.io/postcodes/${searchValue}/autocomplete`,
      undefined,
      handleNoResult
    );
    const ulElement = document.querySelector("#autocomplete");
    ulElement.innerHTML = "";
    result.forEach((element) => {
      let liElement = document.createElement("li");
      let buttonElement = document.createElement("button");
      buttonElement.innerHTML = element;
      buttonElement.setAttribute("onclick", `renderSearchValue('${element}')`);
      buttonElement.setAttribute("type", "button");
      liElement.appendChild(buttonElement);
      ulElement.appendChild(liElement);
    });
    hide("#autocomplete", false);
  } catch (error) {
    alert(error);
  }
}

// * ------------ event handlers
async function handleSubmit(e) {
  let postcode = e;
  if (typeof e != "string") {
    e.preventDefault();
    postcode = e.target[0].value;
  }
  postcode = postcode.replaceAll(" ", "");
  const json = await fetchWeather(postcode);
  renderImage(json.current_weather.weathercode);
  document.getElementById("curr_temp").innerHTML =
    json.current_weather.temperature + " °C";
  let hourlyHum = json.hourly.relativehumidity_2m;
  const humidityAvg =
    hourlyHum.reduce((acc, curr) => acc + curr) / hourlyHum.length;
  const details = document.getElementById("weather-details").children;
  // validate
  details[0].innerHTML =
    "Precipitation: " + json.daily.precipitation_sum[0] + "mm";
  details[1].innerHTML = "Windspeed: " + json.current_weather.windspeed + "kmh";
  details[2].innerHTML = "Humidity: " + Math.floor(humidityAvg) + "%";
  populateDaysOfWeek(
    json.daily.weathercode,
    json.daily.apparent_temperature_max
  );
  renderChart(json);
  hide("#results", false);
  hide("#week", false);
  hide("#autocomplete");
  hide("#postcodeForm");
  document.querySelector("header > button").innerHTML = postcode;
}

const handlePostcodeFormSubmit = (event) => {
  event.stopPropagation(); //prevent document.click running
  toggle("#postcodeForm");
};

// closest searches hole dom to find nearest ancestor or just that element. if it isnt that element beign compraed it returns null
function handleClick(event) {
  function hideElement(selector) {
    const element = document.querySelector(selector);
    if (!element.classList.contains("hidden")) {
      if (!event.target.closest(selector) && element != "none") {
        hide(selector);
        return true;
      }
    }
    return false;
  }
  hideElement("#autocomplete") || hideElement("#postcodeForm"); // js stops on first thing that returns true when using ||
}

// *  --------------- renderers
const renderImage = (weatherCode) => {
  const sectionElement = document.querySelector("#results");
  const firstDesc = sectionElement.firstElementChild;
  const currTemp = document.querySelector("#curr_temp");
  const insertIFRAME = () => {
    const iframe = document.createElement("iframe");
    iframe.src = `./icons/weather-codes/${weatherCode}.svg`;
    iframe.title = "WeatherIcon";
    iframe.ariaHidden = "true";
    iframe.tabIndex = "-1";
    sectionElement.insertBefore(iframe, currTemp);
  };
  // lots of nesting but seemed most efficient after diffrent refatoring attempts
  if (firstDesc.tagName == "IFRAME") {
    const prevCode = firstDesc.src.split("/").pop().slice(0, -4);
    if (weatherCode != prevCode) {
      firstDesc.remove();
      insertIFRAME();
    }
  } else insertIFRAME();
};

const renderSearchValue = (newValue) => {
  const inputElement = document.querySelector("input");
  inputElement.value = newValue;
  hide("#autocomplete");
};

async function renderWeatherInformation(postcode, elements, parent) {
  const json = await fetchWeather(postcode);
  elements(json).forEach((element) => {
    parent.appendChild(element);
  });
}

async function renderWorldWeather() {
  let randomCities = {};
  for (let i = 0; i < 4; i++) {
    const result = await fetchResult(
      "https://api.postcodes.io/random/postcodes"
    );
    randomCities[result.admin_district] = result.postcode;
  }
  const global = document.getElementById("global");
  for (let [index, [key, value]] of Object.entries(
    Object.entries(randomCities)
  )) {
    const li = `<li class="card city text-center flex flex__col"> <p> ${key} </p> </li>`;
    global.innerHTML += li;
    await renderWeatherInformation(
      value,
      createCurrentWeather,
      global.children[index]
    );
  }
}

const renderChart = (json) => {
  google.charts.load("current", { packages: ["corechart"] });
  google.charts.setOnLoadCallback(drawChart);
  function drawChart() {
    console.log("rendering");
    const data = new google.visualization.DataTable();
    data.addColumn("string", "Hour");
    data.addColumn("number", "Temperature");
    data.addColumn({ type: "number", role: "annotation" });
    let rows = [];
    for (let i = 0; i < 24; i++) {
      const value = Math.floor(json.hourly.temperature_2m[i]);
      rows.push([
        `${i < 10 ? "0" + i : i}:00`,
        value,
        i % 2 == 0 ? null : value,
      ]);
    }
    data.addRows(rows);

    const textColour = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--text-colour");
    console.log(textColour);

    let options = {
      // forceIFrame: true,
      width: 327,
      height: 130,
      backgroundColor: "transparent",
      colors: ["orange"],
      annotations: {
        stemColor: "none",
        textStyle: {
          color: "#d1bd9e",
        },
      },
      vAxis: {
        minValue: 0,
        gridlines: {
          color: "transparent",
        },
        textStyle: {
          color: "none",
        },
      },
      hAxis: {
        showTextEvery: 4,
        textStyle: {
          // ! cant use variable text-colour ?
          color: `#d1bd9e`,
        },
      },
      legend: "none",
    };

    let chart = new google.visualization.AreaChart(
      document.getElementById("chart_div")
    );
    chart.draw(data, options);
  }
};

// * ------------- data manipulation
const createWeatherInformation = (weathercode, temperature) => {
  const iframe = document.createElement("iframe");
  iframe.src = `./icons/weather-codes/${weathercode}.svg`;
  iframe.title = "weatherIcon";
  iframe.ariaHidden = "true";
  iframe.tabIndex = "-1";
  const p = document.createElement("p");
  p.innerText = temperature + "°";
  return [iframe, p];
};

const createCurrentWeather = (json) => {
  return createWeatherInformation(
    json.current_weather.weathercode,
    json.current_weather.temperature
  );
};

function populateDaysOfWeek(weathercodes, temperatures) {
  const weekElement = document.getElementById("week").children;
  const weekElementList = Array.from(weekElement);
  weekElementList.forEach((parentElement, index) => {
    parentElement.innerHTML = parentElement.innerText.slice(0, 3);
    createWeatherInformation(weathercodes[index], temperatures[index]).forEach(
      (childElement) => {
        parentElement.appendChild(childElement);
      }
    );
  });
}

// * --------------- class togglers
const toggle = (selector, classname = "hidden") => {
  document.querySelector(selector).classList.toggle(classname);
};

const hide = (selector, hidden = true) => {
  if (hidden) {
    document.querySelector(selector).classList.add("hidden");
  } else {
    document.querySelector(selector).classList.remove("hidden");
  }
};

// * -------------- handle getting users locaiton on start up
async function handlePosition(location) {
  const { latitude, longitude } = location.coords;
  const ll = [latitude, longitude];
  const postcode = await fetchPostcode(...ll);
  if (postcode) {
    // document.querySelector("input[type=text]").value = postcode;
    renderProcessLoading("Rendering local weather ...");
    await handleSubmit(postcode);
    renderProcessLoading("Finished");
    // 380 is fixed width of inside ladoing screen, 100 is fixed increment (percetnage of number of process)
    const loadingStyles = getComputedStyle(document.querySelector(".loading"));
    const width = parseInt(loadingStyles.width.split("px")[0]);
    console.log(width - width / 3);
    renderLoadingBar(width - width / 3);
    setTimeout(() => toggle("#loading"), 300);
  }
}

function showError(error) {
  console.error("getCurrentPosition returned error", error);
}

// * ---------------- loading
async function loading() {
  // const loadingElement = document.getElementById("loading");
  let total = 1;
  document.addEventListener("click", handleClick);
  renderProcessLoading("Rendering world weather ...");
  total = renderLoadingBar(total);
  await renderWorldWeather();
  renderProcessLoading("Getting your location ...");
  total = renderLoadingBar(total);
  navigator.geolocation.getCurrentPosition(handlePosition, showError);
}

const renderLoadingBar = (total) => {
  const loadingStyles = getComputedStyle(document.querySelector(".loading"));
  let increment = parseInt(loadingStyles.width.split("px")[0]) / 6;
  const value = total + increment;
  document.querySelector("hr").style.width = value + "px";
  return value;
};

const renderProcessLoading = (process) => {
  const pElement = document.getElementById("processing");
  pElement.innerHTML = process;
};

// ? on reload
loading();
