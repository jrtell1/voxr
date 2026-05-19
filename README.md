# Voxr

A Discord alternative built with Elixir/Phoenix (backend) and Electron/React (desktop client).

## Prerequisites

- [Elixir](https://elixir-lang.org/install.html) ~> 1.15
- [Erlang/OTP](https://www.erlang.org/downloads) (installed alongside Elixir)
- [PostgreSQL](https://www.postgresql.org/download/) running locally
- [Node.js](https://nodejs.org/) (LTS recommended)

## Backend (Phoenix)

The Phoenix server runs on `http://localhost:4000`.

**First-time setup:**

```bash
mix setup
```

This installs dependencies, creates the database, runs migrations, and seeds it.

**Start the server:**

```bash
mix phx.server
```

The default dev database config expects PostgreSQL on `localhost` with username `postgres` and password `postgres`. Adjust `config/dev.exs` if needed.

## Client (Electron)

The Electron app is in the `client/` directory.

**Install dependencies:**

```bash
cd client
npm install
```

**Start the desktop app:**

```bash
npm run dev
```

This launches the Electron window with hot reload via `electron-vite`.

## Running both together

Open two terminals:

```bash
# Terminal 1 — Phoenix backend
mix phx.server

# Terminal 2 — Electron client
cd client && npm run dev
```
