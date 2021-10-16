import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { RollupOptions } from 'rollup'
import postcss from 'rollup-plugin-postcss'
import assetPlugin from './lib/asset-plugin'
import createHTMLPlugin from './lib/create-html'
import cssModuleTypes from './lib/css-module-types'
import { eslint } from './lib/eslint-plugin'
const config: RollupOptions = {
    input: 'src/app.tsx',
    output: {
        format: 'es',
        dir: 'dist',
    },
    plugins: [
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
        typescript(),
        assetPlugin(),
        nodeResolve(),
        createHTMLPlugin({
            templatePath: 'src/index.html',
            output: 'index.html',
            shellJSPath: 'dist/shell.js',
            shellCSSPath: 'dist/shell.css',
            iconPath: 'res/images/logo.svg',
        }),
    ],
}

const shellConfig = {
    ...config,
    input: 'src/shell.tsx',
    output: {
        format: 'cjs',
        dir: 'dist',
    },
    plugins: config.plugins?.filter(p => p && p.name !== 'create-html-plugin'),
}

export default [shellConfig, config]
