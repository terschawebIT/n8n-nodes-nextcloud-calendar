// ESLint Flat Config für TypeScript und n8n Nodes (ESM)
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import n8nPlugin from 'eslint-plugin-n8n-nodes-base';

export default [
  // Basisempfehlungen für TypeScript (Flat Config)
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: false,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'n8n-nodes-base': n8nPlugin,
    },
    rules: {
      // projektspezifische Regeln bei Bedarf ergänzen
    },
  },
];
