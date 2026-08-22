# ldocs

ldocs is a local-first document editor for human and coding-agent review
workflows.

The current milestone provides the local application runtime. The editor,
storage, comments, agent integration, and Google Docs synchronization will be
added incrementally.

## Development

Requirements:

- Node.js 24 or newer
- pnpm 11.21.0

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Open `http://127.0.0.1:43110`.

The port can be changed through `LDOCS_PORT`:

```bash
LDOCS_PORT=43111 pnpm dev
```

## Commands

```bash
pnpm dev           # Start Fastify and Vite on one loopback port
pnpm build         # Build the browser and server applications
pnpm start         # Run the production build
pnpm test          # Run unit and architecture tests
pnpm test:runtime  # Build and smoke-test development and production
pnpm test:e2e      # Build and run the Chromium browser smoke suite
pnpm verify        # Run the core lint, type, test, format, and build gate
```

Fastify owns the HTTP server in both development and production. Vite runs as
middleware during development, and the production build is served from the same
origin.

Runtime and browser tests start isolated ldocs processes on operating-system
assigned loopback ports and stop them after the suite. The application does not
open a document library yet, so these tests cannot access user document data.
