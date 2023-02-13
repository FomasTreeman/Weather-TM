const getTemp = (e) => {
  e.preventDefault();
  let value = e.target[0].value.replaceAll(" ", "");
  fetch(`https://api.postcodes.io/postcodes/${value}/validate`)
    .then((resp) => resp.json())
    .then((json) => {
      if (!json.result) {
        throw new Error("invalid postcode");
      } else return json;
    })
    .then(() => fetch(`https://api.postcodes.io/postcodes/${value}`))
    .then((res) => res.json())
    .then((json) => [json.result.longitude, json.result.latitude])
    .then((ll) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${ll[1]}&longitude=${ll[0]}&current_weather=true`
      )
    )
    .then((res) => res.json())
    .then((json) => {
      selectImage(json.current_weather.weathercode);
      return json.current_weather.temperature;
    })
    .then((temp) => {
      document.getElementById("curr_temp").innerHTML = temp + " °C";
      hideAutocomplete();
      togglePostcodeForm();
      successPostcode();
    })
    // TODO improve error handling to give user feedback
    .catch(console.error);
};

const selectImage = (weatherCode) => {
  const sectionElement = document.querySelector("#results");
  const firstDesc = sectionElement.firstChild;
  // refactor
  if (firstDesc.tagName == "IMG") {
    const prevCode = firstDesc.src.split("/").pop().slice(0, -4);
    if (weatherCode != prevCode) {
      firstDesc.remove();
      const imgElement = `<img src="/icons/weather-codes/${weatherCode}.svg" alt="weatherIcon">`;
      sectionElement.innerHTML += imgElement;
    }
  } else {
    const imgElement = `<img src="/icons/weather-codes/${weatherCode}.svg" alt="weatherIcon">`;
    sectionElement.innerHTML += imgElement;
  }
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

// closest searches hole dom to find nearest ancestor or just that element. if it isnt that element beign compraed it returns null
const checkClickOutside = (closeSelector, hiddenEl, func) => {
  document.addEventListener("click", (event) => {
    const ulDisplay = document.querySelector(hiddenEl).style.display;
    if (!event.target.closest(closeSelector) && ulDisplay != "none") func();
  });
};
