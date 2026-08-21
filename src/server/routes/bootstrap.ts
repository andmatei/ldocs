import type { FastifyInstance } from 'fastify';

export function registerBootstrapRoute(app: FastifyInstance): void {
  app.get('/v1/bootstrap', (_request, reply) => {
    return reply.header('cache-control', 'no-store').send({
      status: 'ready',
    });
  });
}
