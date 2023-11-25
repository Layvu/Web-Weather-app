import {get_time_api, get_weather_api} from './api.js';

async function getWeather(latitude, longitude) {
    try {
        const response = await fetch(get_weather_api(latitude, longitude));
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const currentWeather = await response.json();
        getWeatherParameters(currentWeather, latitude, longitude);
        loadPhotos(currentWeather['weather'][0]['icon']);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function getWeatherParameters(currentWeather, latitude, longitude) {
    const mainInfo = currentWeather['main'];
    const windInfo = currentWeather['wind'];
    const roundToCelsius = (kelvin) => Math.round(kelvin - 273);
    const roundWindSpeed = (speed) => Math.round(speed * 36) / 10;

    document.querySelector('.main-info__list-item-temperature')
        .textContent = `${roundToCelsius(mainInfo['temp'])}°C`;
    document.querySelector('.main-info__list-item-feels')
        .textContent = `${roundToCelsius(mainInfo['feels_like'])}°C`;
    document.querySelector('.main-info__list-item-pressure')
        .textContent = `${mainInfo['pressure']}гПа`;
    document.querySelector('.main-info__list-item-humidity')
        .textContent = `${mainInfo['humidity']}%`;
    document.querySelector('.main-info__list-item-wind-speed')
        .textContent = `${roundWindSpeed(windInfo['speed'])}Км/ч`;
    document.querySelector('.main-info__list-item-wind-direction')
        .textContent = `Ветер`;

    setPlaceName(currentWeather['name'], latitude, longitude);
    placeTime(parseInt(currentWeather['timezone']));
}

function loadPhotos(weatherIcon) {
    const iconUrl = `https://openweathermap.org/img/wn/${weatherIcon}.png`;
    const photoElement = document.querySelector('.main-info__list-item-photo');
    photoElement.style.backgroundImage = `url('${iconUrl}')`;
}

function setPlaceName(place) {
    document.querySelector('.main-info__list-item-place')
        .textContent = place ? place : 'Вне населенного пункта';
}

const placeTime = async (shiftInSeconds) => {
    try {
        const response = await fetch(get_time_api());
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        getTimeInRequiredFormat(await response.json(), shiftInSeconds);
    } catch (error) {
        console.error('Fetch error:', error);
    }
};

const formatNumber = (number) => {
    const integer = Math.floor(number);
    const decimal = Math.round((number - integer) * 100);
    return `${integer}'${decimal.toString().padStart(2, '0')}`;
};

function getTimeInRequiredFormat(tine_utc, seconds_shift) {
    const date = new Date(tine_utc['utc_datetime']);
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();

    let hours = utcHours + seconds_shift / 3600;
    let minutes = utcMinutes;

    if (hours % 1 === 0.5) {
        hours -= 0.5;
        minutes += 30;
        if (minutes >= 60) {
            hours += 1;
            minutes %= 60;
        }
    }

    const formattedHours = Math.floor(hours).toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    document.querySelector('.main-info__list-item-time').textContent = `${formattedHours}:${formattedMinutes}`;
}

let historyCount = 0;
function addToHistory(latitude, longitude) {
    keepHistoryLimit();
    const currentTime = getCurrentTime();
    const historyList = document.getElementById('history-list');
    const historyElement = document.createElement('li');
    historyElement.innerHTML = `
        <h3>${currentTime}</h3>
        <div>
            <p>Широта: ${formatNumber(latitude)}</p>
            <p>Долгота: ${formatNumber(longitude)}</p>
        </div>
    `;

    const currentHistory = document.querySelector('.main-elements__request-history__list');
    currentHistory.prepend(historyElement);
    historyCount++;

    historyList.style.maxHeight = historyList.scrollHeight + 'px';
}

function keepHistoryLimit() {
    const historyList = document.querySelector('.main-elements__request-history__list');
    const setLimit = 3;

    while (historyCount >= setLimit) {
        historyList.removeChild(historyList.lastChild);
        historyCount--;
    }
}

function getCurrentTime() {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function checkInputValidity(latitude, longitude) {
    let latitudeValid = -90 <= latitude && latitude <= 90;
    let longitudeValid = -180 <= longitude && longitude <= 180;

    if (!latitudeValid) {
        document.querySelector('.main-elements__input-list-item-latitude').style.backgroundColor = '#ff8585';
        return true;
    } else {
        document.querySelector('.main-elements__input-list-item-latitude').style.backgroundColor = '#FFF'; // Задайте здесь цвет фона, который соответствует обычному состоянию
    }

    if (!longitudeValid) {
        document.querySelector('.main-elements__input-list-item-longitude').style.backgroundColor = '#ff8585';
        return true;
    } else {
        document.querySelector('.main-elements__input-list-item-longitude').style.backgroundColor = '#FFF'; // Задайте здесь цвет фона, который соответствует обычному состоянию
    }

    return false;
}

const showWeather = document.querySelector('.main-elements__part-get-weather');
showWeather.onclick = async function () {
    const latitude = document.querySelector('.main-elements__input-list-item-latitude').value;
    const longitude = document.querySelector('.main-elements__input-list-item-longitude').value;

    if (!checkInputValidity(parseFloat(latitude), parseFloat(longitude))) {
        try {
            await getWeather(latitude, longitude);
            getMap(latitude, longitude);
            addToHistory(latitude, longitude);
        } catch (error) {
            throw new Error('Error showWeather.onclick');
        }
    }
}

const showHistory = document.querySelector('.main-elements__request-history__part');
showHistory.addEventListener('click', function () {
    const current_history = document.getElementById('history-list');
    const computedStyle = window.getComputedStyle(current_history);

    if (computedStyle.display === 'none' || computedStyle.maxHeight === '0px') {
        current_history.style.display = 'block';
        current_history.style.maxHeight = current_history.scrollHeight + 'px';
    } else {
        current_history.style.display = 'none';
        current_history.style.maxHeight = '0';
    }
});

let myMap;
let mapIsShown = false;
function getMap(latitude, longitude) {
    ymaps.ready(init);

    function init () {
        if (mapIsShown) {
            myMap.destroy();
        }
        myMap = new ymaps.Map('map', {
                center: [latitude, longitude],
                zoom: 8
            },
            {
                searchControlProvider: 'yandex#search'
            });
        mapIsShown = true;
    }
}