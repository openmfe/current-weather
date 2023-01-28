import * as fs from "fs"
import fetch from "node-fetch"

const BASE_URL = "https://api.open-meteo.com/v1/forecast?latitude=__LAT__&longitude=__LON__&hourly=temperature_2m,relativehumidity_2m,precipitation,rain,showers,snowfall,weathercode,cloudcover,cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m,winddirection_10m,windgusts_10m&daily=weathercode,sunrise,sunset,precipitation_sum,rain_sum,showers_sum,snowfall_sum,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant&current_weather=true&timezone=Europe%2FBerlin"
const CACHE_TTL = 5 * 60 * 1000
const ONE_HOUR = 3600 * 1000
const ONE_DAY = 24 * ONE_HOUR

export default async function ({ lat, lon }) {
    lat = parseFloat(lat)
    lon = parseFloat(lon)

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new RangeError("Invalid values for lat/lon!")
    }

    // NOTE regarding times: Times in the feed refer to Europe/Berlin, but JS times are UTC by default.
    // Be careful with mappings.

    const now = new Date()
    const todayBegin = new Date(new Date().setHours(0, 0, 0, 0));
    const latStr = lat.toFixed(2)
    const lonStr = lon.toFixed(2)

    const cacheFile = `/tmp/current-weather-${latStr}-${lonStr}.json`
    let weather = []

    if (0 && fs.existsSync(cacheFile) && new Date(fs.statSync(cacheFile).mtime) > new Date(now.getTime() - CACHE_TTL)) {
        weather = JSON.parse(fs.readFileSync(cacheFile))
    } else {
        const url = BASE_URL.replace("__LAT__", latStr).replace("__LON__", lonStr)
        const data = await (await fetch(url)).json()

        for (let d = 0; d <= 6; d++) {
            const sunrise = new Date(data.daily.sunrise[d])
            const sunset = new Date(data.daily.sunset[d])

            const entry = {
                date: new Date(todayBegin.getTime() + d * ONE_DAY),
                hourly : []
            }

            for (let h = 0; h <= 23; h++) {
                const idx = d * 24 + h
                const time = new Date(entry.date.getTime() + h * ONE_HOUR)

                entry.hourly[h] = {
                    t: data.hourly.temperature_2m[idx],
                    w: data.hourly.windspeed_10m[idx],
                    p: data.hourly.precipitation[idx],
                    c: data.hourly.weathercode[idx],
                    i: getWeatherIcon(time, sunrise, sunset, data.hourly.weathercode[idx], data.hourly.precipitation[idx], data.hourly.snowfall[idx])
                }
            }

            entry.day = {
                t: {
                    h: Math.max(...entry.hourly.map(hVals => hVals.t)),
                    l: Math.min(...entry.hourly.map(hVals => hVals.t)),
                    a: entry.hourly.map(hVals => hVals.t).reduce((a, b) => a + b, 0) / 24,
                },
                w: {
                    h: Math.max(...entry.hourly.map(hVals => hVals.w)),
                    l: Math.min(...entry.hourly.map(hVals => hVals.w)),
                    g: data.daily.windgusts_10m_max[d],
                    a: entry.hourly.map(hVals => hVals.w).reduce((a, b) => a + b, 0) / 24,
                },
                p: {
                    h: Math.max(...entry.hourly.map(hVals => hVals.p)),
                    l: Math.min(...entry.hourly.map(hVals => hVals.p)),
                    t: data.daily.precipitation_sum[d]
                },
                c: data.daily.weathercode[d],
                sr: sunrise,
                ss: sunset,
                i: getWeatherIcon(null, sunrise, sunset, data.daily.weathercode[d], data.daily.precipitation_sum[d], data.daily.snowfall_sum[d])
            }

            weather.push(entry)
        }

        fs.writeFileSync(cacheFile, JSON.stringify(weather))
    }

    return weather
}

function getWeatherIcon(time, sunrise, sunset, weathercode, temp, pTotal, pSnow) {

    const timeOfDay = (!time || (time > sunrise && time < sunset)) ? "day" : "night"

    /*
        from https://www.jodc.go.jp/data_format/weather-code.html and https://open-meteo.com/en/docs
        0 	        Clear sky
        1, 2, 3 	Mainly clear, partly cloudy, and overcast
        45, 48 	    Fog and depositing rime fog
        51, 53, 55 	Drizzle: Light, moderate, and dense intensity
        56, 57 	    Freezing Drizzle: Light and dense intensity
        61, 63, 65 	Rain: Slight, moderate and heavy intensity
        66, 67 	    Freezing Rain: Light and heavy intensity
        71, 73, 75 	Snow fall: Slight, moderate, and heavy intensity
        77 	        Snow grains
        80, 81, 82 	Rain showers: Slight, moderate, and violent
        85, 86 	    Snow showers slight and heavy
        95 * 	    Thunderstorm: Slight or moderate
        96, 99 * 	Thunderstorm with slight and heavy hail
    */

    let thunderstormType = ""

    if (pTotal > 10 || weathercode >= 96) {
        thunderstormType = "-extreme"
    } else if (pTotal > 3) {
        thunderstormType = "-overcast"
    }

    if (pTotal > 1) {
        thunderstormType += (pTotal / 2 > pSnow) ? "-snow" : "-rain"
    }

    const intensity = {
        0:  `clear-${timeOfDay}`,
        1:  `partly-cloudy-${timeOfDay}`,
        2:  `partly-cloudy-${timeOfDay}`,
        3:  `overcast-${timeOfDay}`,

        45: pTotal < 1 ? `partly-cloudy-${timeOfDay}-fog` : `overcast-${timeOfDay}-fog`,
        48: `partly-cloudy-${timeOfDay}-haze`,

        51: `partly-cloudy-${timeOfDay}-drizzle`,
        53: `overcast-${timeOfDay}-drizzle`,
        55: `extreme-${timeOfDay}-drizzle`,
        56: `overcast-${timeOfDay}-sleet`,
        57: `extreme-${timeOfDay}-sleet`,

        61: `partly-cloudy-${timeOfDay}-rain`,
        63: `overcast-${timeOfDay}-rain`,
        65: `extreme-${timeOfDay}-rain`,
        66: `overcast-${timeOfDay}-sleet`,
        67: `extreme-${timeOfDay}-sleet`,

        71: `partly-cloudy-${timeOfDay}-snow`,
        73: `overcast-${timeOfDay}-snow`,
        75: `extreme-${timeOfDay}-snow`,
        77: `overcast-${timeOfDay}-snow`,

        80: `partly-cloudy-${timeOfDay}-rain`,
        81: `overcast-${timeOfDay}-rain`,
        82: `extreme-${timeOfDay}-rain`,
        85: `overcast-${timeOfDay}-snow`,
        86: `extreme-${timeOfDay}-snow`,

        95: `thunderstorms-${timeOfDay}${thunderstormType}`,
        96: `thunderstorms-${timeOfDay}${thunderstormType}`,
        99: `thunderstorms-${timeOfDay}${thunderstormType}`,
    }

    return intensity[weathercode]
}
