const getTemp = (e) => {
    console.log()
    e.preventDefault()
    let value = e.target[0].value.replaceAll(' ', '')
    console.log(value)
    fetch(`https://api.postcodes.io/postcodes/${value}`)
     .then(res => res.json())
     .then(json => [json.result.longitude, json.result.latitude])
     .then(ll => {return fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ll[1]}&longitude=${ll[0]}&current_weather=true`)})
     .then(res => res.json())
     .then(json => json.current_weather.temperature)
     .then(temp => {
        document.getElementById('curr_temp').innerHTML = temp + ' C'
     })
     .catch(console.error)
} 