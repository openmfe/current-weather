import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import minify from 'rollup-plugin-minify-html-literals'
import copy from 'rollup-plugin-copy'
import sass from 'sass'
import json from "@rollup/plugin-json"
import resolve from '@rollup/plugin-node-resolve'
import { randomUUID } from "node:crypto"

// for the copy plugin
const transform = contents => contents.toString()
    .replace(/__BACKEND_URL__/g, process.env.MFE_BACKEND_URL)
    .replace(/__FRONTEND_URL__/g, process.env.MFE_FRONTEND_URL)

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/main.js',
        format: 'iife'
    },
    watch: {
        exclude: 'src/node_modules/**',
        clearScreen: false
    },
    plugins: [
        { // watch manifest for changes
            async buildStart() {
                this.addWatchFile("src/openmfe/manifest.yaml")
            }
        },
        { // scss loader
            transform(code, id) {
                return (id.slice(-5) === '.scss') ? {
                    code: `export default '${sass.compileString(code, { style: "compressed" }).css}'`,
                } : null;
            }
        },
        resolve(),
        json(),
        process.env.BUILD === "prod" ? minify({
            include: ["src/**/*.js"],
            options: {
                shouldMinify(template) {
                    return (template.parts.some(part => {
                        return (
                            part.text.includes('<style') ||
                            part.text.includes('<div')
                        )
                    }))
                }
            },
            failOnError: true
        }) : null,
        copy({
            targets: [
                { src: ['src/fonts', 'src/openmfe'], dest: 'dist' },
                { src: 'src/openmfe/manifest.yaml', dest: 'dist/openmfe', transform },
                { src: 'src/index.html', dest: 'dist', transform },
                { src: "node_modules/@lxg/weather-icons/production/fill/svg-static", dest: "dist/img/weather/fill/" },
                { src: "node_modules/@lxg/weather-icons/production/line/svg-static", dest: "dist/img/weather/line/" }
             ]
        }),
        replace({
            preventAssignment: false,
            'html': '', // we use the html only for hinting the IDE
            '__BACKEND_URL__': process.env.MFE_BACKEND_URL,
            '__FRONTEND_URL__': process.env.MFE_FRONTEND_URL,
            '__RAND__': randomUUID()
        }),
        process.env.BUILD === "prod" ? terser({
            mangle: {
                properties: {
                    regex: ['^_']
                }
            }
        }) : null
    ]
}
