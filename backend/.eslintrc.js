module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
  ],
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '**/*.ts', '**/*.tsx'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console for CLI tools
    'prefer-const': 'error',
    'no-var': 'error',
  },
};