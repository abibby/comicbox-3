module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react-hooks', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:preact/recommended',
        'plugin:prettier/recommended',
        'plugin:react-hooks/recommended',
    ],
    settings: {
        react: {
            version: '17.0',
        },
    },
    ignorePatterns: ['*.css.d.ts'],
    rules: {
        '@typescript-eslint/no-unused-vars': [1, { varsIgnorePattern: '^h$' }],
        'object-shorthand': [2, 'methods'],
        camelcase: 0,
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': [
            'warn',
            {
                additionalHooks: '(useComputed|useResizeEffect)',
            },
        ],
        'no-undef': 0,
    },
}
