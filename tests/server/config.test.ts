import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PORT,
  LOOPBACK_HOST,
  findProjectRoot,
  readRuntimeConfig,
} from '../../src/server/config.js';

const projectRoot = resolve(import.meta.dirname, '../..');

describe('runtime configuration', () => {
  it('uses a loopback-only default configuration', () => {
    expect(readRuntimeConfig([], {}, projectRoot)).toEqual({
      host: LOOPBACK_HOST,
      mode: 'production',
      port: DEFAULT_PORT,
      projectRoot,
    });
  });

  it('allows development mode and an explicit port', () => {
    expect(
      readRuntimeConfig(['node', 'main.js', '--dev'], { LDOCS_PORT: '0' }, projectRoot),
    ).toMatchObject({
      mode: 'development',
      port: 0,
    });
  });

  it('rejects malformed ports', () => {
    expect(() => readRuntimeConfig([], { LDOCS_PORT: 'not-a-port' }, projectRoot)).toThrow();
  });

  it('finds the project root from a nested directory', () => {
    expect(findProjectRoot(resolve(projectRoot, 'src/server'))).toBe(projectRoot);
  });
});
