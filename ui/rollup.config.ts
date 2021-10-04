import typescript from '@rollup/plugin-typescript'
import { RollupOptions } from 'rollup'
import nodeResolve from 'rollup-plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import createHTMLPlugin from './lib/create-html'
import cssModuleTypes from './lib/css-module-types'
// import { Shell } from './src/components/shell'

const config: RollupOptions = {
    input: 'src/app.tsx',
    output: {
        format: 'es',
        dir: 'dist',
    },
    plugins: [
        cssModuleTypes('src/components'),
        postcss({ 
            minimize: true,
            modules: true,
            extract: true
        }),
        typescript(),
        nodeResolve(),
        createHTMLPlugin({
            templatePath: 'src/index.html',
            output: 'index.html',
            shellJSPath: 'dist/shell.js',
            shellCSSPath: 'dist/shell.css',
        }),
    ],
}

const shellConfig = {
    ...config,
    input: 'src/shell.tsx',
    plugins: config.plugins?.filter(p => p && p.name !== 'create-html-plugin'),
}

export default [
    shellConfig,
    config,
]
