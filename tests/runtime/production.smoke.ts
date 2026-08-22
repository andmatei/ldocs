import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type RunningRuntime, startRuntime } from '../helpers/runtime.js';

describe('production runtime', () => {
  let runtime: RunningRuntime | undefined;

  function getRuntime(): RunningRuntime {
    if (!runtime) {
      throw new Error('Production runtime did not start');
    }

    return runtime;
  }

  beforeAll(async () => {
    runtime = await startRuntime('production');
  });

  afterAll(async () => {
    await runtime?.stop();
  });

  it('serves the UI, generated assets, and API from one origin', async () => {
    const activeRuntime = getRuntime();
    const root = await fetch(`${activeRuntime.origin}/`, {
      headers: {
        accept: 'text/html',
        connection: 'close',
      },
    });
    const html = await root.text();
    const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];

    expect(root.status).toBe(200);
    expect(root.headers.get('content-type')).toContain('text/html');
    expect(scriptPath).toBeDefined();

    const assetUrl = new URL(scriptPath ?? '', activeRuntime.origin);
    const [asset, bootstrap] = await Promise.all([
      fetch(assetUrl, {
        headers: { connection: 'close' },
      }),
      fetch(`${activeRuntime.origin}/api/v1/bootstrap`, {
        headers: { connection: 'close' },
      }),
    ]);

    expect(assetUrl.origin).toBe(activeRuntime.origin);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');

    expect(bootstrap.status).toBe(200);
    expect(await bootstrap.json()).toEqual({
      status: 'ready',
    });
  });

  it('serves client routes without swallowing missing API or asset requests', async () => {
    const activeRuntime = getRuntime();
    const [clientRoute, missingApi, missingAsset] = await Promise.all([
      fetch(`${activeRuntime.origin}/documents/example`, {
        headers: {
          accept: 'text/html',
          connection: 'close',
        },
      }),
      fetch(`${activeRuntime.origin}/api/v1/missing`, {
        headers: { connection: 'close' },
      }),
      fetch(`${activeRuntime.origin}/missing.js`, {
        headers: {
          accept: 'application/javascript',
          connection: 'close',
        },
      }),
    ]);

    expect(clientRoute.status).toBe(200);
    expect(clientRoute.headers.get('content-type')).toContain('text/html');

    expect(missingApi.status).toBe(404);
    expect(await missingApi.json()).toEqual({
      code: 'API_ROUTE_NOT_FOUND',
    });

    expect(missingAsset.status).toBe(404);
    expect(await missingAsset.json()).toEqual({
      code: 'ROUTE_NOT_FOUND',
    });
  });
});
