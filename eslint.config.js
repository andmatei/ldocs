import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];
const clientFiles = ['src/client/**/*.{ts,tsx}'];
const clientEditorFiles = ['src/client/editor/**/*.{ts,tsx}'];
const domainFiles = ['src/domain/**/*.{ts,tsx}'];
const serverFiles = ['src/server/**/*.{ts,tsx}'];
const adapterFiles = ['src/adapters/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: sourceFiles,
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },
  {
    files: clientFiles,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'import-x/no-nodejs-modules': 'error',
    },
  },
  {
    files: clientFiles,
    ignores: clientEditorFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(lexical$|@lexical/)|(^|/)(server|adapters)(/|$)',
              message:
                'Client features must access Lexical through the client editor adapter and server capabilities through HTTP.',
            },
          ],
        },
      ],
    },
  },
  {
    files: clientEditorFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(server|adapters)(/|$)',
              message: 'Client editor modules cannot depend on server or adapter modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: domainFiles,
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-nodejs-modules': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(react($|/)|react-dom($|/)|lexical$|@lexical/)|(^|/)(client|server|adapters)(/|$)',
              message:
                'Domain modules must remain independent of client, server, adapter, React, and Lexical runtime code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [...serverFiles, ...adapterFiles],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: serverFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react($|/)|react-dom($|/)|lexical$|@lexical/)|(^|/)client(/|$)',
              message: 'Server modules cannot depend on client, React, or Lexical runtime code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: adapterFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react($|/)|react-dom($|/)|lexical$|@lexical/)|(^|/)(client|server)(/|$)',
              message:
                'Adapter modules may depend on domain contracts but not client, server, React, or Lexical runtime code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: reactHooks.configs.flat.recommended.plugins,
    rules: reactHooks.configs.flat.recommended.rules,
  },
  {
    files: ['*.config.{js,ts}', 'eslint.config.js', 'tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
