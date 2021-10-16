import find from 'find'
import { Plugin } from 'rollup'
import DtsCreator from 'typed-css-modules'

function newCreator() {
    return new DtsCreator({
        camelCase: true,
        namedExports: false,
    })
}

async function writeTypes(file: string, creator = newCreator()) {
    const content = await creator.create(file)
    await content.writeFile()
}

function findFiles(pattern: string | RegExp, root: string): Promise<string[]> {
    return new Promise(resolve => {
        find.file(pattern, root, resolve)
    })
}

export default function cssModuleTypes(root: string): Plugin {
    return {
        name: 'css-module-types',
        async buildStart() {
            const creator = newCreator()

            const files = await findFiles(/\.css$/, root)

            const promises = files.map(async file => {
                this.addWatchFile(file)
                await writeTypes(file, creator)
            })

            await Promise.all(promises)
        },
        async watchChange(id) {
            if (!id.endsWith('.css')) {
                return null
            }
            await writeTypes(id)
        },
    }
}
