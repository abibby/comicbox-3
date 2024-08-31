/* eslint-disable no-restricted-imports */
import { resolve } from 'path'
import { defineConfig, loadEnv, UserConfig } from 'vite'
import preact from '@preact/preset-vite'
import buildAssetPlugin from './lib/build-assets-plugin'
import cssModuleTypes from './lib/css-module-types'
import manifestPlugin from './lib/manifest-plugin'
import staticOutputPlugin from './lib/static-output-plugin'

export default defineConfig(({ mode }): UserConfig => {
    const env = {
        ...process.env,
        ...loadEnv(mode, resolve(__dirname, '..')),
    }

    return {
        envPrefix: 'COMICBOX_',
        plugins: [
            manifestPlugin({
                appName: 'ComicBox',
                source: resolve(__dirname, './res/images/logo.svg'),
                maskableSource: resolve(
                    __dirname,
                    './res/images/logo-maskable.svg',
                ),
                appShortName: 'ComicBox',
                appDescription:
                    'ComicBox allows you to read your digital comic collection where ever you are',
                display: 'standalone',
                start_url: '/',
                theme_color: '#2196F3',
                background: '#F0F0F0',
                dir: undefined,
                orientation: undefined,
            }),
            staticOutputPlugin(['sw', 'manifest.json']),
            preact(),
            buildAssetPlugin(),
            cssModuleTypes(),
        ],
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, './index.html'),
                    sw: resolve(__dirname, './src/service-worker/sw.ts'),
                },
            },
        },
        resolve: {
            alias: {
                src: resolve(__dirname, './src'),
                res: resolve(__dirname, './res'),
                helpers: resolve(__dirname, './helpers'),
            },
        },
        server: {
            proxy: {
                '/api': env.VITE_PROXY_HOST ?? 'http://localhost:9074',
            },
        },
    }
})
