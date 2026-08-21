import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';

export const DEFAULT_PORT = 43_110;
export const LOOPBACK_HOST = '127.0.0.1' as const;

export type RuntimeMode = 'development' | 'production';

const runtimeEnvironmentSchema = z.object({
  LDOCS_PORT: z
    .string()
    .regex(/^\d+$/, 'LDOCS_PORT must contain only digits')
    .transform(Number)
    .pipe(z.number().int().min(0).max(65_535))
    .optional(),
});

export interface RuntimeConfig {
  host: typeof LOOPBACK_HOST;
  mode: RuntimeMode;
  port: number;
  projectRoot: string;
}

export function findProjectRoot(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const packagePath = join(currentDirectory, 'package.json');

    if (existsSync(packagePath)) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error(`Could not find the ldocs project root from ${startDirectory}`);
    }

    currentDirectory = parentDirectory;
  }
}

export function readRuntimeConfig(
  argv: readonly string[] = process.argv,
  environment: NodeJS.ProcessEnv = process.env,
  startDirectory: string = import.meta.dirname,
): RuntimeConfig {
  const parsedEnvironment = runtimeEnvironmentSchema.parse(environment);

  return {
    host: LOOPBACK_HOST,
    mode: argv.includes('--dev') ? 'development' : 'production',
    port: parsedEnvironment.LDOCS_PORT ?? DEFAULT_PORT,
    projectRoot: findProjectRoot(startDirectory),
  };
}
