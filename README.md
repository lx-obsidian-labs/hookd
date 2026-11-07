# Hookd

**AI skill tooling prototype | LX Obsidian Labs**

This repository contains a nested `hooked-project/` workspace with planning documents, skill instructions and a Next.js web application. It is a **prototype**, not a certified production service.

## Repository layout

- `hooked-project/planning/` — planning material
- `hooked-project/skill.md` and related files — agent skill documentation
- `hooked-project/web/` — Next.js web application, tests and application source

## Development

The web application is **not at the repository root**:

```bash
cd hooked-project/web
npm ci
npm run dev
```

Its manifest also defines:

```bash
npm run lint
npm run test
npm run build
```

The test script uses `tsx --test`. Commands are source-confirmed, but execution results and deployment availability have not been verified here.

## Before public release

- Confirm implemented features against planning documents.
- Document authentication, skill import/execution boundaries and any AI provider integrations.
- Verify tests, build, dependency security and production configuration.
- Add screenshots, licensing and third-party attribution after review.

**Maintainer:** [LX Obsidian Labs](https://github.com/lx-obsidian-labs) · [Contact](mailto:vilanenathan@gmail.com)
