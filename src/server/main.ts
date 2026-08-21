import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { buildServer } from './app.js';
import { readRuntimeConfig } from './config.js';

interface RuntimeReadyMessage {
  address: string;
  type: 'ldocs:ready';
}

function notifyParentProcess(address: string): void {
  if (process.send) {
    const message: RuntimeReadyMessage = {
      address,
      type: 'ldocs:ready',
    };

    process.send(message);
  }
}

function registerShutdownHandlers(app: FastifyInstance): void {
  let shutdown: Promise<void> | undefined;

  const close = (signal: NodeJS.Signals): void => {
    shutdown ??= (async () => {
      app.log.info({ signal }, 'shutting down ldocs');

      try {
        await app.close();
      } catch (error) {
        app.log.error({ err: error }, 'failed to shut down ldocs cleanly');
        process.exitCode = 1;
      }
    })();

    void shutdown;
  };

  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

function describeStartupError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        const location = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${location}${issue.message}`;
      })
      .join('; ');
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function main(): Promise<void> {
  let app: FastifyInstance | undefined;

  try {
    const config = readRuntimeConfig();
    app = await buildServer({
      mode: config.mode,
      projectRoot: config.projectRoot,
      logger: true,
    });

    const address = await app.listen({
      host: config.host,
      port: config.port,
    });

    registerShutdownHandlers(app);
    notifyParentProcess(address);
    app.log.info({ address }, 'ldocs is ready');
  } catch (error) {
    const message = describeStartupError(error);

    if (app) {
      app.log.error({ err: error }, `failed to start ldocs: ${message}`);

      try {
        await app.close();
      } catch (closeError) {
        app.log.error({ err: closeError }, 'failed to clean up after startup failure');
      }
    } else {
      console.error(`ldocs failed to start: ${message}`);
    }

    process.exitCode = 1;
  }
}

await main();
