import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { apiPlugin } from '../../src/server/api/plugin.js';

describe('API plugin', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('returns bootstrap information without caching it', async () => {
    app = Fastify();
    await app.register(apiPlugin, {
      prefix: '/api',
    });

    const response = await app.inject('/api/v1/bootstrap');

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({
      status: 'ready',
    });
  });

  it.each(['/api', '/api/', '/api/v1/missing'])(
    'keeps the API 404 response scoped to %s',
    async (url) => {
      app = Fastify();
      await app.register(apiPlugin, {
        prefix: '/api',
      });

      const response = await app.inject(url);

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.json()).toEqual({
        code: 'API_ROUTE_NOT_FOUND',
      });
    },
  );
});
