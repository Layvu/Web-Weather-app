export function get_time_api() {
    return 'http://worldtimeapi.org/api/timezone/Europe/London';
}
export function get_weather_api(latitude, longitude) {
    return `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=cd23f64cf6891303203824e60377d6e6`;
}

