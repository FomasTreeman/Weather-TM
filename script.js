const getTemp = (e) => {
  e.preventDefault();
  let value = e.target[0].value.replaceAll(" ", "");

//   refactor this.
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
    .then((json) => json.current_weather.temperature)
    .then((temp) => {
      document.getElementById("curr_temp").innerHTML = temp + " C";
      hideAutocomplete();
    })
    // improve error handling to give user feedback
    .catch(console.error);
};

const getSuggestion = (inputElement) => {
  const ulElement = document.querySelector("ul");
  let searchValue = inputElement.target.value;
  ulElement.style.display = searchValue == "" ? "none" : "block";
  if (!searchValue) return;
  console.log(searchValue)
  fetch(`https://api.postcodes.io/postcodes/${searchValue}/autocomplete`)
    .then((resp) => resp.json())
    .then((json) => {
        console.log(json.result)
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
      });
    })
    .catch(console.error);
}

const setSearchValue = (newValue) => {
  console.log(newValue);
  const inputElement = document.querySelector("input");
  inputElement.value = newValue;
  hideAutocomplete();
};

const hideAutocomplete = () => {
  console.log("hide");
  document.querySelector("ul").style.display = "none";
};
