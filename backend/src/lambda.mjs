import runtime from "./runtime.mjs"

const endpoints = { runtime }

export const handler = async event => {
    if (!event.rawPath) {
        return { statusCode: 400, body: "Bad request!" }
    }

    try {
        const response = {
            headers: {
                "Content-Type": "*/*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS"
            }
        }

        const path = event.rawPath.replace(/^\/+|\/+$/g, '').split("/")
        const endpoint = path[1]

        if (!endpoints[endpoint]) {
            return { statusCode: "404", body: `Endpoint ${endpoint} not found!` }
        }


        const weather = await endpoints[endpoint](event.queryStringParameters || {})

        response.body = JSON.stringify(weather)
        response.statusCode = 200

        return response
    } catch (error) {
        if (error instanceof RangeError) {
            return { statusCode: 400, body: error.message }
        }

        return { status: "400", body: "Bad rrrequest." }
    }
}
