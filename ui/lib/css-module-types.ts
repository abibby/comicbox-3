import { Plugin } from 'vite'
import DtsCreator from 'typed-css-modules'

type DtsCreatorOptions = ConstructorParameters<typeof DtsCreator>[0]

export default function cssModuleTypes(
    options: DtsCreatorOptions = {},
): Plugin {
    const creator = new DtsCreator({
        camelCase: true,
        namedExports: false,
        ...options,
    })
    async function writeTypes(file: string) {
        const content = await creator.create(file)
        await content.writeFile()
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

        async watchChange(id) {
            if (!id.endsWith(suffix)) {
                return
            }

            await writeTypes(id)
        },
    }
}
