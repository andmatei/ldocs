import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];
const browserFiles = ['src/app/**/*.{ts,tsx}', 'src/editor/**/*.{ts,tsx}'];
const nodeFiles = [
  'src/server/**/*.ts',
  'src/storage/**/*.ts',
  'src/agents/**/*.ts',
  'src/google/**/*.ts',
];

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
    files: browserFiles,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'import-x/no-nodejs-modules': 'error',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(lexical$|@lexical/)|(^|/)(server|storage|agents|google)(/|$)',
              message:
                'Application modules must access Lexical through editor adapters and server capabilities through the HTTP API.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/editor/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '(^|/)(server|storage|agents|google)(/|$)',
              message: 'Editor modules cannot depend on Node-side modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/documents/**/*.ts', 'src/comments/**/*.ts'],
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
              regex: '^(react($|/)|react-dom($|/)|lexical$|@lexical/)|(^|/)editor(/|$)',
              message:
                'Document and comment contracts must remain independent of React, Lexical, and editor runtime classes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react($|/)|react-dom($|/)|lexical$|@lexical/)|(^|/)(app|editor)(/|$)',
              message: 'Node-side modules cannot depend on React or the Lexical editor runtime.',
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
