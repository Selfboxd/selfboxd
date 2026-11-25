# AGENTS.md

Selfboxd is a self-hosted, privacy-first tracker for films, series and books. This repository
holds the whole self-hosted application and its Docker image.

## Non-negotiable rules

- Everything is written in English: code, comments, commit messages, documentation.
- No emojis anywhere.
- TypeScript is strict. Never use `any`.
- Comments are short and say what the commented element is. Never write a comment about a
  feature, a plan, a TODO, a history note or anything similar.
- No secrets and no information about any deployment environment in this repository.
- No telemetry. The instance never sends statistics anywhere.
- No social features: no friends, no followers, no activity feed.
- The only logos are the Selfboxd logo and the TMDB attribution logo in `src/lib/assets`. Never
  use a Letterboxd logo, icon or button.
- Every change ships with tests. End-to-end tests are the most important part of the project.

## Stack

- SvelteKit with Svelte 5 runes, front end and back end in one project, `adapter-node`.
- SQLite through `better-sqlite3` and Drizzle ORM.
- Paraglide for translations.
- Vitest for unit tests, Playwright for end-to-end tests.
- Prettier and ESLint.
- Docker image published to GHCR.

## Layout

| Path                      | Content                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `src/routes`              | Pages and endpoints                                        |
| `src/routes/api/v1`       | JSON API, also consumed by the mobile application          |
| `src/lib/components`      | Svelte components                                          |
| `src/lib/styles`          | Global styles; `theme.css` holds every design token        |
| `src/lib/server`          | Server-only code                                           |
| `src/lib/server/auth`     | Accounts, passwords, sessions, sign-in throttling          |
| `src/lib/server/api`      | Helpers shared by the JSON endpoints                       |
| `src/lib/catalog`         | Types of films and other works, shared by server and pages |
| `src/lib/server/tmdb`     | TMDB client, local cache and conversion to catalog types   |
| `src/lib/server/media`    | Image processing and storage                               |
| `src/lib/server/settings` | Settings shared by every account of the instance           |
| `src/lib/i18n`            | Helpers that turn codes and dates into translated text     |
| `src/lib/server/db`       | Database connection, schema and migration runner           |
| `src/lib/server/security` | Security helpers                                           |
| `src/env.ts`              | Declaration of every environment variable                  |
| `messages`                | Translations, one JSON file per locale                     |
| `drizzle`                 | Generated SQL migrations                                   |
| `e2e`                     | Playwright tests                                           |

Keep this structure clean: one responsibility per file, no catch-all file, no needless
fragmentation.

## Commands

| Command               | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start the development server               |
| `npm run lint`        | Prettier and ESLint                        |
| `npm run check`       | Type check                                 |
| `npm run test:unit`   | Vitest                                     |
| `npm run test:e2e`    | Build the application and run Playwright   |
| `npm run format`      | Format every file                          |
| `npm run db:generate` | Generate a migration after a schema change |

Run lint, check and both test suites before every commit. All of them must pass.

## Conventions

### Imports

Import from `src/lib` through the `#lib/*` alias with the `.js` extension, for example
`#lib/server/db/index.js`. Use relative imports inside one directory.

### Styles

Never hard-code a colour, a font, a size or a spacing in a component. Use the custom properties
of `src/lib/styles/theme.css`, and add a token there when one is missing.

Inline `style` attributes are blocked by the Content-Security-Policy. Use classes.

### Translations

Every string shown to the user comes from `messages`. Add each key to all locale files.
English is the base locale.

### Database

Change `src/lib/server/db/schema.ts`, then run `npm run db:generate` and commit the generated
migration. Never edit a migration that has been released. Migrations are applied when the
server starts.

Everything an instance stores lives in the single directory given by `DATA_DIR`.

### API

Endpoints live under `/api/v1` and return JSON. Validate every input on the server.

- Errors are `{ "error": "<code>" }` with a matching HTTP status; build them with
  `src/lib/server/api/responses.ts`.
- Clients authenticate with `Authorization: Bearer <token>`; browsers use the session cookie.
- Requests with a body must be sent as `application/json`.
- Access rules for every path are decided in `src/lib/server/auth/access.ts`. A new public
  path must be added there.

### Security

- Keep the Content-Security-Policy in `vite.config.ts` strict. Widen it only for a documented
  need, with the narrowest source possible.
- Every response carries the headers of `src/lib/server/security/headers.ts`.
- Each external API key belongs to the user and is stored on the instance. Only the TMDB key
  is required; a feature whose optional key is missing is hidden.
- Respect external API rate limits: cache responses locally, and on a 429 wait for the
  indicated delay before a single retry.
- Security behaviour is covered by tests in `e2e/security.e2e.ts`.

### Public profile images

- Profile picture: the only custom image sent to the platform. The instance resizes it to a
  square of at most 400 x 400 px, compresses it, strips all metadata (EXIF, GPS), then sends
  it encoded inside the signed profile update.
- Banner: an official film banner chosen by the user. It is referenced, never uploaded.
- Posters: the public profile shows the poster selected by the user when it is an official
  one (TMDB or MoviePosterDB). It is served from the official source with the API keys of the
  platform.
- Custom posters imported by the user never leave the instance. For those works the public
  profile shows the default official poster.
- No other image is sent to the platform or stored by it.

### External APIs

- Every call to TMDB goes through `src/lib/server/tmdb/service.ts`, which caches responses and
  validates their shape. Never call an external API from a page or a component.
- Text coming from an external API is rendered as text. Never use `{@html}` on it.
- End-to-end tests never reach a real external API: they run against the fake TMDB server of
  `e2e/support/tmdb`.

### Tests

- Unit tests sit next to the code as `*.spec.ts`.
- End-to-end tests are `e2e/*.e2e.ts` and cover endpoints, features, the front end and
  security.
- Test names describe behaviour.

## Releases

Pushing a `vX.Y.Z` tag publishes the Docker image to GHCR and creates the GitHub release.
