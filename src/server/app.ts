import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { apiPlugin } from './api/plugin.js';
import type { RuntimeMode } from './config.js';
import { registerFrontend } from './frontend.js';

export interface BuildServerOptions {
  logger?: FastifyServerOptions['logger'];
  mode: RuntimeMode;
  projectRoot: string;
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return undefined;
  }

  return typeof error.statusCode === 'number' ? error.statusCode : undefined;
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });
  const defaultErrorHandler = app.errorHandler;

  app.setErrorHandler((error, request, reply) => {
    const statusCode = getErrorStatusCode(error);

    if (statusCode && statusCode < 500) {
      return defaultErrorHandler(error, request, reply);
    }

    request.log.error({ err: error }, 'unhandled request error');

    return reply.code(500).send({
      code: 'INTERNAL_ERROR',
    });
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
