import { Plugin } from 'vite'
import { exec } from 'node:child_process'

export default function gzipPlugin(): Plugin {
    const extensions = ['js', 'css', 'html', 'json']
    return {
        name: 'gzip-plugin',

        async writeBundle(options, _bundle) {
            await new Promise<void>((resolve, reject) => {
                exec(
                    `bash -c 'gzip -k "${options.dir}/"*.{${extensions.join(
                        ',',
                    )}}'`,
                    (err, _stdout, stderr) => {
                        if (err) {
                            // eslint-disable-next-line no-console
                            console.error(stderr)
                            reject(err)
                        } else {
                            resolve()
                        }
                    },
                )
            })
        },
    }
}
