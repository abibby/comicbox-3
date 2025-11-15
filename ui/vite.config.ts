/* eslint-disable no-restricted-imports */
import { resolve } from 'path'
import { defineConfig, loadEnv, UserConfig } from 'vite'
import preact from '@preact/preset-vite'
import buildAssetPlugin from './lib/build-assets-plugin'
import cssModuleTypes from './lib/css-module-types'
import manifestPlugin from './lib/manifest-plugin'
import staticOutputPlugin from './lib/static-output-plugin'
import constantsPlugin from './lib/constants-plugin'
import screenshotList from './res/screenshots/index.json'
import { Screenshot } from 'lib/webmanifest'

export default defineConfig(({ mode }): UserConfig => {
    const env = {
        ...process.env,
        ...loadEnv(mode, resolve(__dirname, '..')),
    }

    const screenshotDir = resolve(__dirname, './res/screenshots')

    return {
        envPrefix: 'COMICBOX_',
        plugins: [
            manifestPlugin({
                name: 'ComicBox',
                source: resolve(__dirname, './res/images/logo.svg'),
                maskableSource: resolve(
                    __dirname,
                    './res/images/logo-maskable.svg',
                ),
                short_name: 'ComicBox',
                description:
                    'ComicBox allows you to read your digital comic collection where ever you are',
                display: 'standalone',
                id: 'ca.comicbox',
                start_url: '/',
                theme_color: '#2196F3',
                background_color: '#F0F0F0',
                categories: ['books', 'entertainment'],
                scope: '/',
                screenshots: screenshotList as Screenshot[],
            }),
            constantsPlugin({
                ANILIST_CLIENT_ID: '',
                PUBLIC_USER_CREATE: true,
                BUILD_VERSION: process.env.BUILD_VERSION,
                __ENV: mode,
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
            port: env.VITE_PORT ? Number(env.VITE_PORT) : undefined,
            proxy: {
                '/api': env.VITE_PROXY_HOST ?? 'http://localhost:8080',
            },
        },
        test: {
            setupFiles: ['fake-indexeddb/auto'],
            environment: 'jsdom',
        },
    }
})
