import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import nodeResolve from 'rollup-plugin-node-resolve'
import createHTMLPlugin from './lib/create-html'

export default defineConfig({
    input: 'src/app.tsx',
    output: {
        file: 'dist/bundle.js',
        format: 'es',
    },
    plugins: [
        typescript(),
        nodeResolve(),
        createHTMLPlugin({
            templatePath: 'src/index.html',
            output: 'index.html',
        }),
    ],
})
