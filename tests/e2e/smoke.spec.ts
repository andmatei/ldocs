import { expect, test } from './fixtures.js';

test('loads the React application and same-origin API', async ({ ldocsOrigin, page }) => {
  const browserErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await page.goto(ldocsOrigin);

  await expect(page.getByRole('main')).toHaveText('ldocs');

  const bootstrap = await page.evaluate(async () => {
    const response = await fetch('/api/v1/bootstrap');

    return {
      body: (await response.json()) as unknown,
      status: response.status,
    };
  });

  expect(bootstrap).toEqual({
    body: {
      status: 'ready',
    },
    status: 200,
  });

  await page.goto(`${ldocsOrigin}/documents/example`);

  await expect(page.getByRole('main')).toHaveText('ldocs');
  expect(browserErrors).toEqual([]);
});
