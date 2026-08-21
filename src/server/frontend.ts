import fastifyViteRuntime from '@fastify/vite';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { RuntimeMode } from './config.js';

interface FrontendOptions {
  mode: RuntimeMode;
  projectRoot: string;
}

function acceptsHtml(request: FastifyRequest): boolean {
  const accept = request.headers.accept;

  if (!accept) {
    return false;
  }

  return accept.split(',').some((range) => {
    const [mediaType, ...parameters] = range.split(';');

    if (mediaType?.trim().toLowerCase() !== 'text/html') {
      return false;
    }

    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith('q='));

    if (!quality) {
      return true;
    }

    const value = Number(quality.slice(2));

    return Number.isFinite(value) && value > 0;
  });
}

function sendHtml(reply: FastifyReply): ReturnType<FastifyReply['html']> {
  return reply.header('cache-control', 'no-store').html();
}

export async function registerFrontend(
  app: FastifyInstance,
  options: FrontendOptions,
): Promise<void> {
  await app.register(fastifyViteRuntime, {
    root: options.projectRoot,
    dev: options.mode === 'development',
    spa: true,
  });

  await app.vite.ready();

  app.get('/', (_request, reply) => sendHtml(reply));

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && acceptsHtml(request)) {
      return sendHtml(reply);
    }

    return reply.code(404).send({
      code: 'ROUTE_NOT_FOUND',
    });
  });
}
