async function getTemp(e, elements = null, parent = null) {
  let value = e;
  if (typeof e != "string") {
    console.log("dispaly current");
    e.preventDefault();
    value = e.target[0].value;
  }
  value = value.replaceAll(" ", "");
  try {
    const validateResp = await fetch(
      `https://api.postcodes.io/postcodes/${value}/validate`
    );
    const validateJson = await validateResp.json();
    if (!validateJson.result) throw new Error("invalid postcode");
    const postcodeResp = await fetch(
      `https://api.postcodes.io/postcodes/${value}`
    );
    const postcodeJson = await postcodeResp.json();
    const ll = [postcodeJson.result.longitude, postcodeJson.result.latitude];
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${ll[1]}&longitude=${ll[0]}&current_weather=true&daily=precipitation_sum&timezone=GMT&daily=windspeed_10m_max&hourly=relativehumidity_2m`
    );
    const json = await response.json();
    if (elements == null) return setCurrResults(json);
    console.log(parent);
    // console.log('insert ', elements(json)[1]
    elements(json).forEach((element) => {
      console.log(element, parent);
      parent.appendChild(element);
    });
  } catch (error) {
    // TODO improve error handling to give user feedback
    console.error(error);
  }
}

const setDailySummary = (json) => {
  // console.log(json)
  const img = document.createElement("img");
  img.src = `./icons/weather-codes/${json.current_weather.weathercode}.svg`;
  img.alt = "weatherIcon";
  const p = document.createElement("p");
  p.innerText = json.current_weather.temperature + "°";
  return [img, p];
};

const setCurrResults = (json) => {
  selectImage(json.current_weather.weathercode);
  document.getElementById("curr_temp").innerHTML =
    json.current_weather.temperature + " °C";
  let hourlyHum = json.hourly.relativehumidity_2m;
  const humidityAvg =
    hourlyHum.reduce((acc, curr) => acc + curr) / hourlyHum.length;
  const details = document.getElementById("weather-details").children;
  details[0].innerHTML += json.daily.precipitation_sum[0] + "mm";
  details[1].innerHTML += json.current_weather.windspeed + "kmh";
  details[2].innerHTML += Math.floor(humidityAvg) + "%";
  showResults();
  hideAutocomplete();
  togglePostcodeForm();
  successPostcode();
};

const selectImage = (weatherCode) => {
  const sectionElement = document.querySelector("#results");
  const firstDesc = sectionElement.firstChild;
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

const getSuggestion = (inputElement) => {
  const ulElement = document.querySelector("ul");
  let searchValue = inputElement.target.value;
  ulElement.style.display = searchValue == "" ? "none" : "block";
  if (!searchValue) return;
  fetch(`https://api.postcodes.io/postcodes/${searchValue}/autocomplete`)
    .then((resp) => resp.json())
    .then((json) => {
      if (json.result === null) {
        hideAutocomplete();
        throw new Error("starting characters have no similar postcodes");
      } else return json.result;
    })
    .then((result) => {
      ulElement.innerHTML = "";
      result.forEach((element) => {
        let liElement = document.createElement("li");
        let buttonElement = document.createElement("button");
        buttonElement.innerHTML = element;
        buttonElement.setAttribute("onclick", `setSearchValue('${element}')`);
        buttonElement.setAttribute("type", "button");
        liElement.appendChild(buttonElement);
        ulElement.appendChild(liElement);
        checkClickOutside(".autocomplete", "ul", hideAutocomplete);
      });
    })
    .catch(console.error);
};

const setSearchValue = (newValue) => {
  console.log(newValue);
  const inputElement = document.querySelector("input");
  inputElement.value = newValue;
  hideAutocomplete();
};

const successPostcode = () => {
  let postcode = document.querySelector("input[type=text]").value;
  document.querySelector("header > button").innerHTML = postcode;
};

// const showPostcodeForm = () => {
//   document.getElementById("postcodeForm").style.display = "block";
//   // checkClickOutside("form", "#postcodeForm", hidePostcodeForm);
// };

// const hidePostcodeForm = () => {
//   document.getElementById("postcodeForm").style.display = "none";
// };

const togglePostcodeForm = () => {
  let display = document.getElementById("postcodeForm").style.display;
  document.getElementById("postcodeForm").style.display =
    display == "none" ? "block" : "none";
};

const hideAutocomplete = () => {
  document.querySelector("ul").style.display = "none";
};

const showResults = () => {
  document.querySelector("#results").style.display = "flex";
};

// closest searches hole dom to find nearest ancestor or just that element. if it isnt that element beign compraed it returns null
const checkClickOutside = (closeSelector, hiddenEl, func) => {
  document.addEventListener("click", (event) => {
    const ulDisplay = document.querySelector(hiddenEl).style.display;
    if (!event.target.closest(closeSelector) && ulDisplay != "none") func();
  });
};

async function setGlobalValues() {
  const cityElements = document.getElementsByClassName("city");
  let randomCities = {};
  for (let i = 0; i < 4; i++) {
    const response = await fetch("https://api.postcodes.io/random/postcodes");
    const json = await response.json();
    randomCities[json.result.admin_district] = json.result.postcode;
  }
  // console.log(randomCities);
  const global = document.getElementById("global");
  // global.innerHTML = "";
  for (let key of Object.keys(randomCities)) {
    // console.log(city);
    const li = `<li class="card city text-center flex__col"> ${key} </li>`;
    global.innerHTML += li;
  }

  // console.log(global.children[0], index);
  // async issue use aync await in getTemp
  Promise.all(
    Object.values(randomCities).map((value, index) =>
      getTemp(value, setDailySummary, global.children[index])
    )
  );
}

setGlobalValues();
