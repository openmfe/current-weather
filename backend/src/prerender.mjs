import juice from 'juice'
import { minify } from "html-minifier-terser"
// import data from './data.mjs'

export default async function (request) {
    // const weather = await data(request)

    const html = juice(`
            <style>
                .main { all: initial; display: block; overflow: hidden; }
            </style>

            <div class=main>foobar</div>
    `)

    return await minify(html, {
            minifyJS: true,
            minifyCSS: true,
            removeComments: true,
            removeAttributeQuotes: true,
            collapseWhitespace: true
        })
}
