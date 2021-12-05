import { Plugin } from 'rollup'

export default function resolveFilePlugin(): Plugin {
    return {
        name: 'resolve-file',
        resolveFileUrl({ fileName }) {
            return JSON.stringify('/' + fileName)
        },
    }
}
