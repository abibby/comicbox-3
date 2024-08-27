/* eslint-disable no-restricted-imports */
import { resolve } from 'path'
import { defineConfig, loadEnv, UserConfig } from 'vite'
import preact from '@preact/preset-vite'
import buildAssetPlugin from './lib/build-assets-plugin'
import cssModuleTypes from './lib/css-module-types'
import manifestPlugin from './lib/manifest-plugin'
import staticOutputPlugin from './lib/static-output-plugin'
// import{PreRenderedChunk} from'rollup'

export default defineConfig(({ mode }): UserConfig => {
    const env = {
        ...process.env,
        ...loadEnv(mode, resolve(__dirname, '..')),
    }

    return {
        envPrefix: 'COMICBOX_',
        plugins: [
            manifestPlugin(),
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
