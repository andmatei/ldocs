import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../src/server/app.js';

const projectRoot = resolve(import.meta.dirname, '../..');

describe('server error handling', () => {
  const servers: Awaited<ReturnType<typeof buildServer>>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it('hides unexpected error details', async () => {
    const server = await buildServer({
      logger: false,
      mode: 'development',
      projectRoot,
    });
    servers.push(server);
    server.get('/test/unexpected-error', () => {
      throw new Error('secret internal detail');
    });

    const response = await server.inject('/test/unexpected-error');

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'INTERNAL_ERROR',
    });
  });

  it('preserves deliberate client errors', async () => {
    const server = await buildServer({
      logger: false,
      mode: 'development',
      projectRoot,
    });
    servers.push(server);
    server.get('/test/client-error', () => {
      throw Object.assign(new Error('Invalid request'), {
        statusCode: 400,
      });
    });

    const response = await server.inject('/test/client-error');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      message: 'Invalid request',
      statusCode: 400,
    });
  });
});
