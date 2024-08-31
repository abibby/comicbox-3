import { Plugin } from 'vite'

export default function constantsPlugin(
    constants: Record<string, unknown>,
): Plugin {
    const src = Object.entries(constants)
        .map(([k, v]) => `var ${k} = ${JSON.stringify(v)};`)
        .join(' ')
    return {
        name: 'constants-plugin',
        transformIndexHtml(html) {
            return html.replace(/{{.Constants}}/, `<script>${src}</script>`)
        },
    }
}
