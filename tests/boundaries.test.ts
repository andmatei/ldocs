import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({
  cwd: projectRoot,
  overrideConfigFile: resolve(projectRoot, 'eslint.config.js'),
});

const requiredDirectories = [
  'app',
  'editor',
  'documents',
  'comments',
  'storage',
  'server',
  'agents',
  'google',
];

async function lintRuleIds(source: string, relativePath: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(source, {
    filePath: resolve(projectRoot, relativePath),
  });

  if (!result) {
    throw new Error(`ESLint produced no result for ${relativePath}`);
  }

  return result.messages.map((message) => message.ruleId);
}

describe('repository boundaries', () => {
  it('contains every approved source directory', () => {
    for (const directory of requiredDirectories) {
      const path = resolve(projectRoot, 'src', directory);

      expect(existsSync(path), `Missing src/${directory}`).toBe(true);
      expect(statSync(path).isDirectory(), `src/${directory} must be a directory`).toBe(true);
    }
  });

  it('remains a single-package repository', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
    ) as Record<string, unknown>;
    const pnpmWorkspace = readFileSync(resolve(projectRoot, 'pnpm-workspace.yaml'), 'utf8');

    expect(packageJson).not.toHaveProperty('workspaces');
    expect(pnpmWorkspace).not.toMatch(/^\s*packages:/m);
  });

  it('rejects Node built-ins from browser modules', async () => {
    const ruleIds = await lintRuleIds(
      "import { readFile } from 'node:fs';\nvoid readFile;\n",
      'src/app/browser-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('import-x/no-nodejs-modules');
  });

  it('rejects server imports from browser modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../server/main.js';\n",
      'src/app/browser-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects Lexical from document contracts', async () => {
    const ruleIds = await lintRuleIds(
      "import { createEditor } from 'lexical';\nvoid createEditor;\n",
      'src/documents/lexical-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects React from comment contracts', async () => {
    const ruleIds = await lintRuleIds(
      "import { createElement } from 'react';\nvoid createElement;\n",
      'src/comments/react-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('allows Lexical inside the editor boundary', async () => {
    const ruleIds = await lintRuleIds(
      "import { createEditor } from 'lexical';\ncreateEditor();\n",
      'src/editor/allowed-boundary.fixture.ts',
    );

    expect(ruleIds).not.toContain('no-restricted-imports');
  });
});
