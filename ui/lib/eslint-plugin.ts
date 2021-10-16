import { ESLint } from "eslint";
import path from "path";
import { Plugin } from "rollup";
import { createFilter } from "rollup-pluginutils";

function normalizePath(id: string): string {
  return path
    .relative(process.cwd(), id)
    .split(path.sep)
    .join("/");
}

interface EslintOptions {
    include?: Array<string | RegExp> | string | RegExp | null
    exclude?: Array<string | RegExp> | string | RegExp | null
}

export function eslint(options: EslintOptions = {}): Plugin {

    const cli = new ESLint({
        
    });

    const formatterPromise = cli.loadFormatter();

    const filter = createFilter(
        options.include || /.*\.js/,
        options.exclude || /node_modules/
    );

    return {
        name: "eslint",

        async transform(transformedCode, id) {
            const file = normalizePath(id);
            if (await cli.isPathIgnored(file) || !filter(id)) {
                return null;
            }

            const report = await cli.lintFiles(file)

            const formatter = await formatterPromise
            const result = formatter.format(report)

            if (result) {
                // eslint-disable-next-line no-console
                console.log(result)
            }
        }
    };
}
