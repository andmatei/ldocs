import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import type { RuntimeMode } from './config.js';
import { registerFrontend } from './frontend.js';
import { apiPlugin } from './plugins/api.js';

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
  mode: RuntimeMode;
  projectRoot: string;
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  try {
    await app.register(apiPlugin, {
      prefix: '/api',
    });

    await registerFrontend(app, {
      mode: options.mode,
      projectRoot: options.projectRoot,
    });

    return app;
  } catch (error) {
    await app.close().catch(() => undefined);
    throw error;
  }
}
