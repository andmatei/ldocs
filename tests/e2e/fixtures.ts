import { expect, test as base } from '@playwright/test';

import { startRuntime } from '../helpers/runtime.js';

interface LdocsWorkerFixtures {
  ldocsOrigin: string;
}

export const test = base.extend<Record<never, never>, LdocsWorkerFixtures>({
  ldocsOrigin: [
    async ({ browserName }, use) => {
      if (browserName !== 'chromium') {
        throw new Error(`Unsupported browser: ${browserName}`);
      }

      const runtime = await startRuntime('production');

      try {
        await use(runtime.origin);
      } finally {
        await runtime.stop();
      }
    },
    {
      scope: 'worker',
    },
  ],
});

export { expect };
