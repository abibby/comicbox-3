// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReact from 'eslint-plugin-react'

/**
 * @typedef {import('typescript-eslint').ConfigWithExtends} ConfigWithExtends
 * @typedef {Exclude<ConfigWithExtends['plugins'], undefined>} Plugins
 * @typedef {Plugins[keyof Plugins]} Plugin
 * @typedef {Exclude<ConfigWithExtends['rules'], undefined>} Rules
 */

export default tseslint.config(
    {
        files: ['**/*.{ts,tsx}'],
        ignores: ['dist/*', 'node_modules/*', 'src/event.js', '*.css.d.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.lint.json',
            },
        },
    },
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    flattenPlugin(eslintPluginReact, 'recommended', {
        settings: {
            react: {
                version: '18',
            },
        },
    }),
    flattenPlugin(eslintPluginReactHooks, 'recommended'),
    {
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            'react/react-in-jsx-scope': 'off',
            'react/no-unknown-property': 'off',
            'react/prop-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '(^_|^h$)',
                    ignoreRestSiblings: true,
                },
            ],
            'object-shorthand': [2, 'methods'],
            camelcase: 0,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': [
                'warn',
                {
                    additionalHooks:
                        '(useComputed|useResizeEffect|useAsyncCallback)',
                },
            ],
            'no-undef': 0,
            'no-unused-vars': 0,
            'no-useless-constructor': 0,
            'no-restricted-imports': [
                1,
                {
                    patterns: ['.*'],
                },
            ],
        },
        languageOptions: {
            parserOptions: {
                project: './tsconfig.lint.json',
            },
        },
    },
)

/**
 * @template {Record<string, {rules: Rules|Record<string, string|number|undefined>, plugins: string[]}>} R
 * @template {keyof R} K
 * @param {{configs: R}} plugin
 * @param {ConfigWithExtends} [extra]
 * @param {K} ruleSet
 * @returns {ConfigWithExtends}
 */
function flattenPlugin(plugin, ruleSet, extra = {}) {
    const defaults = plugin.configs[ruleSet]
    if (defaults.plugins.length !== 1) {
        throw new Error('')
    }
    const pluginName = defaults.plugins[0]
    return {
        ...extra,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        plugins: {
            ...extra.plugins,
            [pluginName]: plugin,
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        rules: {
            ...extra.rules,
            ...defaults.rules,
        },
    }
}
