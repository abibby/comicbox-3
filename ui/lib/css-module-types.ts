import { Plugin } from 'vite'
import {} from 'node:fs/promises'
import DtsCreator from 'typed-css-modules'
import { DtsContent } from 'typed-css-modules/lib/dts-content'

type DtsCreatorOptions = ConstructorParameters<typeof DtsCreator>[0]

export default function cssModuleTypes(
    options: DtsCreatorOptions = {},
): Plugin {
    const creator = new DtsCreator({
        camelCase: true,
        namedExports: false,
        ...options,
    })
    async function writeTypes(file: string, isDelete: boolean = false) {
        let content: DtsContent
        try {
            content = await creator.create(file, undefined, true, isDelete)
        } catch (e) {
            if (
                e instanceof Error &&
                e.message.includes('no such file or directory')
            ) {
                return
            } else {
                throw e
            }
        }
        if (isDelete) {
            await content.deleteFile()
        } else {
            await content.writeFile()
        }
    }

    const suffix = '.module.css'
    return {
        name: 'css-module-types',
        async load(id) {
            if (!id.endsWith(suffix)) {
                return null
            }

            await writeTypes(id)
        },

        async watchChange(id, change) {
            if (!id.endsWith(suffix)) {
                return
            }
            await writeTypes(id, change.event === 'delete')
        },
    }
}
