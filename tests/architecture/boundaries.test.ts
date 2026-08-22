import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const eslint = new ESLint({
  cwd: projectRoot,
  overrideConfigFile: resolve(projectRoot, 'eslint.config.js'),
});

const allowedSourceDirectories = new Set(['adapters', 'client', 'domain', 'server']);

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
  it('uses only approved top-level source boundaries', () => {
    const directories = readdirSync(resolve(projectRoot, 'src'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const files = readdirSync(resolve(projectRoot, 'src'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    expect(directories).toEqual(expect.arrayContaining(['client', 'server']));
    expect(directories.filter((directory) => !allowedSourceDirectories.has(directory))).toEqual([]);
    expect(files).toEqual([]);
  });

  it('remains a single-package repository', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
    ) as Record<string, unknown>;
    const pnpmWorkspace = readFileSync(resolve(projectRoot, 'pnpm-workspace.yaml'), 'utf8');

    expect(packageJson).not.toHaveProperty('workspaces');
    expect(pnpmWorkspace).not.toMatch(/^\s*packages:/m);
  });

  it('rejects Node built-ins from client modules', async () => {
    const ruleIds = await lintRuleIds(
      "import { readFile } from 'node:fs';\nvoid readFile;\n",
      'src/client/browser-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('import-x/no-nodejs-modules');
  });

  it('rejects server imports from client modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../server/main.js';\n",
      'src/client/browser-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects adapter imports from client modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../adapters/storage/index.js';\n",
      'src/client/browser-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('keeps Lexical behind the client editor boundary', async () => {
    const ruleIds = await lintRuleIds(
      "import { createEditor } from 'lexical';\ncreateEditor();\n",
      'src/client/documents/lexical-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects client imports from server modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../client/main.js';\n",
      'src/server/node-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects Lexical from domain modules', async () => {
    const ruleIds = await lintRuleIds(
      "import { createEditor } from 'lexical';\nvoid createEditor;\n",
      'src/domain/documents/lexical-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects Node built-ins from domain modules', async () => {
    const ruleIds = await lintRuleIds(
      "import { readFile } from 'node:fs';\nvoid readFile;\n",
      'src/domain/documents/node-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('import-x/no-nodejs-modules');
  });

  it('rejects client imports from domain modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../../client/main.js';\n",
      'src/domain/documents/client-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects React from domain modules', async () => {
    const ruleIds = await lintRuleIds(
      "import { createElement } from 'react';\nvoid createElement;\n",
      'src/domain/comments/react-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('rejects server imports from adapter modules', async () => {
    const ruleIds = await lintRuleIds(
      "import '../../server/main.js';\n",
      'src/adapters/storage/server-boundary.fixture.ts',
    );

    expect(ruleIds).toContain('no-restricted-imports');
  });

  it('allows Lexical inside the client editor boundary', async () => {
    const ruleIds = await lintRuleIds(
      "import { createEditor } from 'lexical';\ncreateEditor();\n",
      'src/client/editor/allowed-boundary.fixture.ts',
    );

    expect(ruleIds).not.toContain('no-restricted-imports');
  });
});
