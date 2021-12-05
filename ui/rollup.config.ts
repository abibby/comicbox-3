import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import OMT from '@surma/rollup-plugin-off-main-thread'
import { RollupOptions } from 'rollup'
import cleaner from 'rollup-plugin-cleaner'
import postcss from 'rollup-plugin-postcss'
import assetPlugin from './lib/asset-plugin'
import buildAssets from './lib/build-assets-plugin'
import createHTMLPlugin from './lib/create-html'
import cssModuleTypes from './lib/css-module-types'
import { eslint } from './lib/eslint-plugin'
// import serviceWorkerPlugin from './lib/service-worker-plugin'

const config: RollupOptions = {
    input: ['src/app.tsx'],
    output: {
        format: 'amd',
        dir: 'dist',
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].js',
    },
    plugins: [
        cleaner({
            targets: ['./dist'],
        }),
        cssModuleTypes('src'),
        postcss({
            autoModules: true,
            // minimize: true,
            extract: true,
        }),
        eslint({
            include: /.*\.tsx?$/,
            // exclude: [/node_modules/, /rollup\.config\.ts$/]
        }),
        replace({
            __ENV: JSON.stringify('development'),
            preventAssignment: true,
        }),
        typescript(),
        // serviceWorkerPlugin(),
        assetPlugin(),
        nodeResolve(),
        OMT(),
        createHTMLPlugin({
            templatePath: 'src/index.html',
            output: 'index.html',
            shellJSPath: 'src/shell.js',
            shellCSSPath: 'src/shell.css',
            iconPath: 'res/images/logo.svg',
        }),
        buildAssets(),
    ],
}

export default config
