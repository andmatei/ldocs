import type { FastifyPluginAsync } from 'fastify';

import { registerBootstrapRoute } from './routes/bootstrap.js';

export const apiPlugin: FastifyPluginAsync = async (app) => {
  registerBootstrapRoute(app);

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      code: 'API_ROUTE_NOT_FOUND',
    });
  });
};
