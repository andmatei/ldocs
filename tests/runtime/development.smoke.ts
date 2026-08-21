import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type RunningRuntime, startRuntime } from './runtime-process.js';

describe('development runtime', () => {
  let runtime: RunningRuntime | undefined;

  function getRuntime(): RunningRuntime {
    if (!runtime) {
      throw new Error('Development runtime did not start');
    }

    return runtime;
  }

  beforeAll(async () => {
    runtime = await startRuntime('development');
  });

  afterAll(async () => {
    await runtime?.stop();
  });

  it('serves the API, Vite client, and SPA from one origin', async () => {
    const activeRuntime = getRuntime();
    const [bootstrap, viteClient, root, clientRoute, missingAsset] = await Promise.all([
      fetch(`${activeRuntime.origin}/api/v1/bootstrap`, {
        headers: { connection: 'close' },
      }),
      fetch(`${activeRuntime.origin}/@vite/client`, {
        headers: { connection: 'close' },
      }),
      fetch(`${activeRuntime.origin}/`, {
        headers: {
          accept: 'text/html',
          connection: 'close',
        },
      }),
      fetch(`${activeRuntime.origin}/documents/example`, {
        headers: {
          accept: 'text/html',
          connection: 'close',
        },
      }),
      fetch(`${activeRuntime.origin}/missing.js`, {
        headers: {
          accept: 'application/javascript',
          connection: 'close',
        },
      }),
    ]);

    expect(bootstrap.status).toBe(200);
    expect(await bootstrap.json()).toEqual({
      status: 'ready',
    });

    expect(viteClient.status).toBe(200);
    expect(viteClient.headers.get('content-type')).toContain('javascript');
    expect(await viteClient.text()).toContain('createHotContext');

    expect(root.status).toBe(200);
    expect(root.headers.get('content-type')).toContain('text/html');
    expect(await root.text()).toContain('<div id="root"></div>');

    expect(clientRoute.status).toBe(200);
    expect(clientRoute.headers.get('content-type')).toContain('text/html');
    expect(await clientRoute.text()).toContain('<div id="root"></div>');

    expect(missingAsset.status).toBe(404);
    expect(await missingAsset.json()).toEqual({
      code: 'ROUTE_NOT_FOUND',
    });
  });
});
