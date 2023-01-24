import express from 'express'
import cors from 'cors'
import runtime from './runtime.js'
import prerender from './prerender.js'

const port = process.env.MFE_BACKEND_PORT || 8080
const server = express()
server.use(cors())

const handlers = { api : runtime, prerender }

;(async () => {
    server
        .get("/:path", async (req, res) => {
            try {
                if (!handlers[req.params.path])
                    throw new Error("Invalid path.")

                const response = await handlers[req.params.path](req.query)
                res.status(200).send(response)
            } catch (e) {
                console.log(e)
                res.status(500).send(e.message)
            }
        })
})()

server.listen(port, () => console.log(`Server started listening on port ${port}.`))
