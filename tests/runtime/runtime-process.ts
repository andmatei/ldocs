import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = resolve(import.meta.dirname, '../..');
const runtimeEntry = 'dist/server/main.js';

export type RuntimeMode = 'development' | 'production';

export interface RunningRuntime {
  origin: string;
  stop(): Promise<void>;
}

interface CloseResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

const runtimePorts: Record<RuntimeMode, number> = {
  development: 43_112,
  production: 43_113,
};

export async function startRuntime(mode: RuntimeMode): Promise<RunningRuntime> {
  const port = runtimePorts[mode];
  const origin = `http://127.0.0.1:${port}`;
  const args = [runtimeEntry];

  if (mode === 'development') {
    args.push('--dev');
  }

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      LDOCS_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let spawnError: Error | undefined;
  let closeResult: CloseResult | undefined;

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    output += chunk;
  });
  child.once('error', (error) => {
    spawnError = error;
  });

  const closed = new Promise<CloseResult>((resolveClose) => {
    child.once('close', (code, signal) => {
      const result = { code, signal };
      closeResult = result;
      resolveClose(result);
    });
  });

  const startupDeadline = Date.now() + 10_000;

  while (Date.now() < startupDeadline) {
    if (spawnError) {
      throw new Error(`Could not start ldocs: ${spawnError.message}`);
    }

    if (closeResult) {
      throw new Error(`ldocs exited during startup\n${output.trim()}`);
    }

    try {
      const response = await fetch(`${origin}/api/v1/bootstrap`, {
        headers: {
          connection: 'close',
        },
        signal: AbortSignal.timeout(500),
      });

      await response.arrayBuffer();

      if (response.ok) {
        return {
          origin,
          async stop() {
            if (closeResult) {
              if (closeResult.code !== 0) {
                throw new Error(`ldocs exited unexpectedly\n${output.trim()}`);
              }

              return;
            }

            child.kill('SIGTERM');

            const result = await Promise.race([
              closed.then((value) => ({
                closed: true as const,
                value,
              })),
              delay(5_000).then(() => ({
                closed: false as const,
              })),
            ]);

            if (!result.closed) {
              child.kill('SIGKILL');
              await closed;
              throw new Error(`ldocs did not stop after SIGTERM\n${output.trim()}`);
            }

            if (result.value.code !== 0) {
              throw new Error(`ldocs stopped unsuccessfully\n${output.trim()}`);
            }
          },
        };
      }
    } catch {
      // The server may not be listening yet.
    }

    await delay(50);
  }

  child.kill('SIGKILL');
  await closed;
  throw new Error(`ldocs did not start within 10 seconds\n${output.trim()}`);
}
