module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module',
    extraFileExtensions: ['.json'],
  },
  plugins: ['@typescript-eslint', 'n8n-nodes-base'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:n8n-nodes-base/community',
    'plugin:n8n-nodes-base/credentials',
    'plugin:n8n-nodes-base/nodes',
  ],
}; 