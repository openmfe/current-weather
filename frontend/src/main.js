import L10n from "@lxg/l10n"
import { L10nDateFormat } from "@lxg/l10n/date"
import translations from "../l10n/translations.json"
import scss from "./main.scss"

class CurrentWeather extends HTMLElement
{
    static get observedAttributes() {
        return ["lat", "lon", "locale"]
    }

    constructor() {
        super()

        this._shadow = this.attachShadow({ mode: "open" })
        this._shadow.innerHTML = this.innerHTML // retain skeleton until data is fetched

        // localisation
        this._l10n = new L10n(translations, "de-DE")
        this._l10nDateFormat = new L10nDateFormat(this._l10n)

        // data from API
        this._weather = {}

        // attributes
        this._attr = {}

        // reload every two minutes
        setInterval(this._reload.bind(this), 2 * 60 * 1000)
    }

    async attributeChangedCallback(name, oldValue, newValue) {
        if (newValue && oldValue !== newValue) {
            this._attr[name] = newValue
            this._reload()
        }
    }

    async _reload() {
        if (this._attr.lat && this._attr.lon) {
            await this._fetchData()
            this._render()
        }
    }

    async _render() {
        const now = new Date()

        this._shadow.innerHTML = html`
            <style>${scss}</style>

            <div class="elem">
                <div class="current">
                    <div class="primary row">
                        <img class=cloud src="${ getIcon(this._weather[0].hourly[now.getHours()].i) }" alt="">

                        <div class="temp">
                            <span class="value">${ this._weather[0].hourly[now.getHours()].t.toFixed(1) }</span>
                            <span class="unit">°C</span>
                        </div>
                    </div>

                    <div class="secondary row">
                        <div class="prec cell">
                            <span class="value">${ this._weather[0].hourly[now.getHours()].p.toFixed(1)}</span>
                            <span class="unit">l/m²</span>
                        </div>

                        <div class="wind cell">
                            <span class="value">${Math.round(this._weather[0].hourly[now.getHours()].w) }</span>
                            <span class="unit">km/h</span>
                        </div>
                    </div>
                </div>

                <div class="today row">
                    <div class="cells">
                        <div class="temp cell">
                            <span class=value>${ this._weather[0].day.t.l.toFixed(1)} /
                            ${this._weather[0].day.t.h.toFixed(1) }</span>
                            <span class="unit">°C</span>

                        </div>
                        <div class="prec cell">
                            <span class="value">${ this._weather[0].day.p.t.toFixed(1) }</span>
                            <span class="unit">l/m²</span>
                        </div>
                    </div>
                    <div class="cells">
                        <div class="wind cell">
                            <span class="value">${ Math.round(this._weather[0].day.w.h) }</span>
                            <span class="unit">km/h</span>
                        </div>
                        <div class="gusts cell">
                            <span class="value">${ Math.round(this._weather[0].day.w.g) }</span>
                            <span class="unit">km/h</span>
                        </div>
                    </div>
                    <div class="cells">
                        <div class="sunrise cell">
                            <span class=value>${ this._l10nDateFormat.fmt(new Date(this._weather[0].day.sr), "H:i") }</span>
                        </div>

                        <div class="sunset cell">
                            <span class=value>${ this._l10nDateFormat.fmt(new Date(this._weather[0].day.ss), "H:i") }</span>
                        </div>
                    </div>
                </div>
            </div>
        `

        this._elem = this._shadow.querySelector(".elem")
    }

    async _fetchData() {
        const response = await fetch(`__BACKEND_URL__/runtime?lat=${this._attr.lat}&lon=${this._attr.lon}`)
        this._weather = await response.json()
    }
}

const loadFont = (name, style, weight) => {
    const font = new FontFace(
        `current-weather_${name}`,
        `url(__FRONTEND_URL__/fonts/${name}-${style}-${weight}.woff2)`,
        { style, weight }
    )

    font.display = "swap"

    font.load().then(fontface => document.fonts.add(fontface))
}

const fonts = [
    [ "normal", 400 ],
    [ "normal", 500 ]
]

fonts.forEach(font => loadFont("montserat", ...font))

const IMG_URL_TPL = `__FRONTEND_URL__/img/weather/__STYLE__/__ANIM__/__NAME__.svg?__RAND__`

const getIcon = (name, style = "line", anim = false) => IMG_URL_TPL
    .replace("__STYLE__", style)
    .replace("__ANIM__", anim ? "svg" : "svg-static")
    .replace("__NAME__", name)

customElements.define('current-weather', CurrentWeather)