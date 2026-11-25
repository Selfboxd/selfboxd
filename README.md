<p align="center">
  <img src="src/lib/assets/logo.svg" alt="" width="128" height="128" />
</p>

<h1 align="center">Selfboxd</h1>

<p align="center">
  A self-hosted, privacy-first tracker for films, series and books.
</p>

Selfboxd is a Letterboxd-style diary that runs on an instance you host yourself, on a NAS or
a VPS. Your data stays on your instance: no social features, no telemetry, no account on
someone else's server.

This is an AI-driven project. It is built to stay structured, clean and secure, so that humans
can audit it easily.

## Run

```bash
docker compose up -d
```

The instance listens on port 3000 and stores everything in a single volume mounted at `/data`.
Set `ORIGIN` to the URL you use to reach it.

## Develop

```bash
npm install
npm run dev
```

| Command               | Purpose                              |
| --------------------- | ------------------------------------ |
| `npm run lint`        | Check formatting and lint rules      |
| `npm run check`       | Type-check the project               |
| `npm run test:unit`   | Run the unit tests                   |
| `npm run test:e2e`    | Run the end-to-end tests             |
| `npm run format`      | Format every file                    |
| `npm run db:generate` | Generate a migration from the schema |

## License

[AGPL-3.0](LICENSE). Selfboxd is not affiliated with Letterboxd.
