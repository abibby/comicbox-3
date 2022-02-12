import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import omt from '@surma/rollup-plugin-off-main-thread'
import { RollupOptions } from 'rollup'
import cleaner from 'rollup-plugin-cleaner'
import includePaths from 'rollup-plugin-includepaths'
import postcss from 'rollup-plugin-postcss'
import assetPlugin from './lib/asset-plugin'
import buildAssets from './lib/build-assets-plugin'
import createHTMLPlugin from './lib/create-html'
import cssModuleTypes from './lib/css-module-types'
import { eslint } from './lib/eslint-plugin'
import resolveFilePlugin from './lib/resolve-file-plugin'
import staticFileNamePlugin from './lib/static-file-name-plugin'

const config: RollupOptions = {
    input: ['src/app.tsx'],
    output: {
        format: 'amd',
        dir: 'dist',
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash].[ext]',
        sourcemap: true,
    },
    plugins: [
        cleaner({
            targets: ['./dist'],
        }),
        staticFileNamePlugin({
            files: ['service-worker'],
        }),
        resolveFilePlugin(),
        cssModuleTypes('src'),
        postcss({
            autoModules: true,
            // minimize: true,
            extract: true,
            plugins: [require('autoprefixer')],
        }),
        eslint({
            include: /.*\.tsx?$/,
        }),
        replace({
            preventAssignment: true,
            values: {
                __ENV: JSON.stringify('development'),
            },
        }),
        assetPlugin(),
        includePaths(),
        typescript(),
        nodeResolve(),
        omt(),
        createHTMLPlugin({
            templatePath: 'src/index.html',
            output: 'index.html',
            shellJSPath: 'src/shell.js',
            shellCSSPath: 'src/shell.css',
            iconPath: 'res/images/logo.svg',
            appleIconPath: 'res/images/logo-full.svg',
            manifestPath: 'src/manifest.json',
        }),
        buildAssets(),
    ],
}

export default config
