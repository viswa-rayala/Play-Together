# Play Together

Play Together is a React application for sharing media playback sessions through room IDs. A host creates a room, shares its ID, and other users can verify and join that room.

## Current Architecture

```text
Browser (React + Vite)
        |
        | HTTP: create and validate room IDs
        v
Express API (server/)
        |
        | Supabase service-role connection
        v
Supabase PostgreSQL (rooms table)
```

The frontend is in `client/`. The backend is in `server/`.

- The React client renders the UI and calls the backend room API.
- The Express server validates requests and is the only component allowed to use the Supabase service-role key.
- Supabase stores active room records.
- The current playback and participant event layer is still the mock socket service in `client/src/services/socket.js`. It is suitable for UI development but is not shared between different browsers or devices yet.

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the SQL from `server/schema.sql`.
4. Open Supabase **Settings -> API Keys**.
5. Create or copy a server-only secret/service-role key. Do not create or change the JWT secret.
6. Create `server/.env` from `server/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
PORT=3001
```

Never commit `server/.env`. The service-role key bypasses database row-level security and must remain on the server.

## Installation

From the repository root:

```bash
npm run install:all
npm install
```

The root install provides `concurrently`, which runs the client and server together.

## Development

Start both applications from the repository root:

```bash
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:3001/health`

To start them separately:

```bash
npm --prefix server run dev
npm --prefix client run dev -- --host 0.0.0.0
```

If testing from another device on the same network, open the network URL printed by Vite. The backend listens on all interfaces through the Express server and the frontend automatically uses the current browser hostname unless `VITE_API_URL` is set.

## Client Environment

The client has an optional environment template at `client/.env.example`:

```env
VITE_API_URL=http://localhost:3001
```

Use `VITE_API_URL` when the backend is hosted at a different URL. Do not put Supabase secret keys in the client environment.

## Room API

### Health check

```http
GET /health
```

### Create a room

```http
POST /api/rooms/create
Content-Type: application/json

{
  "roomId": "ABC123",
  "hostId": "host"
}
```

The server returns `409` when the requested room ID already exists.

### Validate a room

```http
GET /api/rooms/ABC123/exists
```

A valid response looks like:

```json
{
  "valid": true,
  "exists": true
}
```

## Database

The `rooms` table stores:

- `id`: unique room ID
- `host_id`: host identifier
- `created_at`: creation timestamp
- `is_active`: whether the room accepts joins
- `participant_count`: current participant count placeholder for the realtime layer

The database schema is maintained in `server/schema.sql`. Apply schema changes in Supabase before using new backend fields.

## Production Build

Build the client with:

```bash
npm run build
```

Start the backend in production mode with:

```bash
npm --prefix server start
```

The client build output is generated in `client/dist/` and should not be committed.

## Git and Secrets

The root `.gitignore` excludes:

- environment files such as `.env`
- dependency folders
- build output
- logs and local editor files

The committed environment templates are safe placeholders:

- `client/.env.example`
- `server/.env.example`

Before pushing code, verify that `server/.env` is not listed by `git status`. If a service-role key has ever been committed or shared, revoke it in Supabase and create a replacement.

## Next Architecture Step

For real cross-device rooms, replace the mock socket service with a realtime transport. Supabase Realtime can broadcast playback events and participant changes, or the Express server can expose a WebSocket layer. The room API and database schema provide the persistence and room-existence boundary needed for that upgrade.
