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

export interface StartRuntimeOptions {
  /**
   * Additional child-process environment values. Tests always override
   * LDOCS_PORT with `0` so the operating system assigns an available port.
   */
  environmentOverrides?: NodeJS.ProcessEnv;
}

interface CloseResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface RuntimeReadyMessage {
  address: string;
  type: 'ldocs:ready';
}

function isRuntimeReadyMessage(message: unknown): message is RuntimeReadyMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const candidate = message as Partial<RuntimeReadyMessage>;

  return candidate.type === 'ldocs:ready' && typeof candidate.address === 'string';
}

export async function startRuntime(
  mode: RuntimeMode,
  options: StartRuntimeOptions = {},
): Promise<RunningRuntime> {
  const args = [runtimeEntry];

  if (mode === 'development') {
    args.push('--dev');
  }

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...options.environmentOverrides,
      LDOCS_PORT: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let output = '';
  let spawnError: Error | undefined;
  let closeResult: CloseResult | undefined;

  if (!child.stdout || !child.stderr) {
    child.kill();
    throw new Error('ldocs runtime was started without output pipes');
  }

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

  const ready = new Promise<string>((resolveReady) => {
    const handleMessage = (message: unknown): void => {
      if (isRuntimeReadyMessage(message)) {
        child.off('message', handleMessage);
        resolveReady(message.address);
      }
    };

    child.on('message', handleMessage);
  });

  const startup = await Promise.race([
    ready.then((address) => ({
      address,
      status: 'ready' as const,
    })),
    closed.then(() => ({
      status: 'closed' as const,
    })),
    delay(10_000).then(() => ({
      status: 'timeout' as const,
    })),
  ]);

  if (spawnError) {
    throw new Error(`Could not start ldocs: ${spawnError.message}`);
  }

  if (startup.status !== 'ready') {
    if (!closeResult) {
      child.kill('SIGKILL');
      await closed;
    }

    const reason = startup.status === 'closed' ? 'exited during startup' : 'did not start in time';
    throw new Error(`ldocs ${reason}\n${output.trim()}`);
  }

  const origin = new URL(startup.address).origin;
  const response = await fetch(`${origin}/api/v1/bootstrap`, {
    headers: {
      connection: 'close',
    },
    signal: AbortSignal.timeout(1_000),
  });

  await response.arrayBuffer();

  if (!response.ok) {
    child.kill('SIGKILL');
    await closed;
    throw new Error(`ldocs readiness check failed with ${response.status}\n${output.trim()}`);
  }

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
