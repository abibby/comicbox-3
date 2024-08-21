/* eslint-disable no-restricted-imports */
import path from 'path'
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import assetPlugin from './lib/asset-plugin'
import buildAssetPlugin from './lib/build-assets-plugin'
import cssModuleTypes from './lib/css-module-types'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [assetPlugin(), preact(), buildAssetPlugin(), cssModuleTypes()],
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, './index.html'),
                sw: path.resolve(__dirname, './src/service-worker/sw.ts'),
            },
            output: {
                entryFileNames(file) {
                    if (file.name == 'sw') {
                        return '[name].js'
                    }
                    return '[name]-[hash].js'
                },
                chunkFileNames: '[name]-[hash].js',
                assetFileNames: '[name]-[hash].[ext]',
            },
        },
    },
    resolve: {
        alias: {
            src: path.resolve(__dirname, './src'),
            res: path.resolve(__dirname, './res'),
            helpers: path.resolve(__dirname, './helpers'),
        },
    },
    server: {
        proxy: {
            '/api': 'http://localhost:9074',
        },
    },
})
