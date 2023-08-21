/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        'src/(.*)': '<rootDir>/src/$1',
        'res/(.*)': '<rootDir>/res/$1',
    },
    setupFiles: ['fake-indexeddb/auto'],
    modulePathIgnorePatterns: ['<rootDir>/tests/integration/']
}
