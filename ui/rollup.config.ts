import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import omt from '@surma/rollup-plugin-off-main-thread'
import { RollupOptions } from 'rollup'
import cleaner from 'rollup-plugin-cleaner'
import commonjs from 'rollup-plugin-commonjs'
import includePaths from 'rollup-plugin-includepaths'
import postcss from 'rollup-plugin-postcss'
import assetPlugin from './lib/asset-plugin'
import buildAssets from './lib/build-assets-plugin'
import createHTMLPlugin from './lib/create-html'
import cssModuleTypes from './lib/css-module-types'
import { eslint } from './lib/eslint-plugin'
import resolveFilePlugin from './lib/resolve-file-plugin'
import staticFileNamePlugin from './lib/static-file-name-plugin'

const config = (args: Record<string, unknown>): RollupOptions => {
    const dev = 'dev' in args && typeof args.dev === 'boolean' && args.dev
    const __ENV = dev ? 'development' : 'production'

    return {
        preserveEntrySignatures: false,
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
                files: ['sw'],
            }),
            resolveFilePlugin(),
            cssModuleTypes('src'),
            postcss({
                autoModules: true,
                minimize: !dev,
                extract: true,
                plugins: [require('autoprefixer')],
            }),
            eslint({
                include: /.*\.tsx?$/,
            }),
            replace({
                preventAssignment: true,
                values: {
                    __ENV: JSON.stringify(__ENV),
                    'process.env.NODE_ENV': JSON.stringify(__ENV),
                },
            }),
            assetPlugin(),
            includePaths(),
            typescript(),
            nodeResolve(),
            commonjs({
                include: 'node_modules/**', // Default: undefined
            }),
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
}

export default config
