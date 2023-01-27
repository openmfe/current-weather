import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import minify from 'rollup-plugin-minify-html-literals'
import copy from 'rollup-plugin-copy'
import sass from 'sass'
import json from "@rollup/plugin-json"
import resolve from '@rollup/plugin-node-resolve'
import { randomUUID } from "node:crypto"

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/main.js',
        format: 'iife'
    },
    watch: {
        clearScreen: false
    },
    plugins: [
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
                { src: ['src/openmfe', 'src/fonts', 'src/index.html'], dest: 'dist' },
                {
                    src: 'src/openmfe/manifest.yaml',
                    dest: 'dist/openmfe',
                    transform: contents => contents.toString()
                        .replace(/__BACKEND_URL__/g, process.env.MFE_BACKEND_URL)
                        .replace(/__FRONTEND_URL__/g, process.env.MFE_FRONTEND_URL)
                },
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
