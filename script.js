document.addEventListener("click", handleClick);

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

async function fetchTemp(postcode) {
  try {
    const validateResult = await fetchResult(
      `https://api.postcodes.io/postcodes/${postcode}/validate`
    );
    const { longitude, latitude } = await fetchResult(
      `https://api.postcodes.io/postcodes/${postcode}`
    );

    let url = new URL(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`
    );
    let params = new URLSearchParams(url.search);
    params.append("current_weather", true);
    params.append("timezone", "GMT");
    params.append("daily", "precipitation_sum");
    params.append("daily", "windspeed_10m_max");
    params.append("daily", "apparent_temperature_max");
    params.append("hourly", "relativehumidity_2m");

    const response = await fetch(url + params);
    const json = await response.json();
    console.log(json);
    return json;
  } catch (error) {
    // TODO improve error handling to give user feedback
    console.error(error);
  }
}

async function handleSubmit(e) {
  let postcode = e;
  if (typeof e != "string") {
    console.log("dispaly current");
    e.preventDefault();
    postcode = e.target[0].value;
  }
  console.log(e);
  postcode = postcode.replaceAll(" ", "");
  console.log(postcode);
  const json = await fetchTemp(postcode);
  console.log(json);
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
  hide("#results", false);
  hide("#autocomplete");
  hide("#postcodeForm");
  document.querySelector("header > button").innerHTML = postcode;
}

async function renderWeather(postcode, elements, parent) {
  const json = await fetchTemp(postcode);
  elements(json).forEach((element) => {
    parent.appendChild(element);
  });
}

const createDailySummaryElements = (json) => {
  // console.log(json)
  const img = document.createElement("img");
  img.src = `./icons/weather-codes/${json.current_weather.weathercode}.svg`;
  img.alt = "weatherIcon";
  const p = document.createElement("p");
  p.innerText = json.current_weather.temperature + "°";
  return [img, p];
};

const renderImage = (weatherCode) => {
  const sectionElement = document.querySelector("#results");
  const firstDesc = sectionElement.firstElementChild;
  const currTemp = document.querySelector("#curr_temp");
  const insertIMG = () => {
    const img = document.createElement("img");
    img.src = `./icons/weather-codes/${weatherCode}.svg`;
    img.alt = "weatherIcon";
    sectionElement.insertBefore(img, currTemp);
  };
  // lots of nesting but seemed most efficient after diffrent refatoring attempts
  if (firstDesc.tagName == "IMG") {
    const prevCode = firstDesc.src.split("/").pop().slice(0, -4);
    if (weatherCode != prevCode) {
      firstDesc.remove();
      insertIMG();
    }
  } else insertIMG();
};

async function fetchAndRenderSuggestion(inputElement) {
  let searchValue = inputElement.target.value.trim();
  try {
    const handleNoResult = () => {
      hide("#autocomplete");
      throw new Error("starting characters have no similar postcodes");
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
    console.error(error);
  }
}

const renderSearchValue = (newValue) => {
  console.log(newValue);
  const inputElement = document.querySelector("input");
  inputElement.value = newValue;
  hide("#autocomplete");
};

const togglePostcodeForm = (event) => {
  event.stopPropagation(); //prevent document.click running
  toggle("#postcodeForm");
};

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

async function renderWorldWeather() {
  const cityElements = document.getElementsByClassName("city");
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
    const li = `<li class="card city text-center flex__col"> ${key} </li>`;
    global.innerHTML += li;
    console.log(key, value, index);
    await renderWeather(
      value,
      createDailySummaryElements,
      global.children[index]
    );
  }
}

renderWorldWeather();

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

async function handlePosition(location) {
  const { latitude, longitude } = location.coords;
  const ll = [latitude, longitude];
  const postcode = await fetchPostcode(...ll);
  if (postcode) {
    // document.querySelector("input[type=text]").value = postcode;
    handleSubmit(postcode);
  }
}

function showError(error) {
  console.log("getCurrentPosition returned error", error);
}

navigator.geolocation.getCurrentPosition(handlePosition, showError);
