module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:preact/recommended',
        'plugin:prettier/recommended',
    ],
    settings: {
        react: {
            version: '17.0',
        },
    },
    rules: {
        '@typescript-eslint/no-unused-vars': [1, { varsIgnorePattern: '^h$' }],
        'object-shorthand': [2, 'methods'],
        camelcase: 0,
    },
}
