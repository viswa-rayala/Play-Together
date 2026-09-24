# Play Together

Play Together is a React application for shared media rooms. A host creates a room, shares its ID, and other users can join for synchronized playback, realtime chat, and an optional audio/video Meet.

## Current Architecture

```text
Browser (React + Vite)
   | HTTP: room creation and validation
   | Socket.IO: playback, chat, and WebRTC signaling
   v
Express API (server/)          Media server (src/mediaServer.cjs)
   |                           | upload and byte-range streaming
   |                           | room state and Socket.IO
   v                           v
In-memory room registry        WebRTC peer connections in browsers
```

The frontend is in `client/`. The backend is in `server/`.

- The React client renders the UI and calls the backend room API.
- The Express server creates and validates room IDs using an in-memory store.
- The media service provides upload, byte-range streaming, room playback, chat, and WebRTC signaling.
- The React room UI connects to that service through `client/src/services/mediaSocket.js`.
- Room IDs are passed into Socket.IO, so playback state and participants are isolated per room.
- Chat messages are kept in memory for the room, with the latest 100 messages sent to new participants.
- Meet media flows directly between browsers through WebRTC; Socket.IO only exchanges signaling messages.

## Requirements

- Node.js 18 or newer
- npm
- A modern browser with camera and microphone support for Meet

## Optional Supabase Setup

The current room API uses an in-memory store, so Supabase is not required for local development or the current runtime. The SQL schema is retained for a future persistent room registry. If you enable Supabase-backed persistence later, create `server/.env` from `server/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
PORT=3001
```

Never commit `server/.env`. A service-role key must remain server-side.

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
- Media server: `http://localhost:3000`

To start them separately:

```bash
npm --prefix server run dev
npm --prefix client run dev -- --host 0.0.0.0
npm run media:dev
```

If testing from another device on the same network, open the network URL printed by Vite. The frontend uses the current browser hostname for the local media server unless `VITE_MEDIA_URL` is set.

For Meet camera and microphone access, use HTTPS in production. Localhost is allowed by browsers during development.

## Client Environment

The client has an optional environment template at `client/.env.example`:

```env
VITE_API_URL=http://localhost:3001
VITE_MEDIA_URL=http://localhost:3000
```

Use both variables when the services are hosted at different URLs. Do not put Supabase secret keys in the client environment.

## Room Features

- Host and participant names are required when entering a room.
- Hosts upload video or audio files and control synchronized play, pause, and seeking.
- Participants receive room playback updates through Socket.IO.
- **Soft Synchronization:** The system actively corrects playback drift by adjusting participant video speed smoothly, avoiding jarring skips.
- Room chat displays messages as `Name: message` and keeps the latest 100 messages in memory.
- Meet supports camera and microphone controls, front/back camera switching, remote video tiles, and host-controlled Meet ending.
- WebRTC uses a public STUN server. A TURN server may be required for users behind restrictive networks.

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

## Room Storage

The current API stores room records in memory, so rooms disappear when the API restarts. `server/schema.sql` describes the optional Supabase table for a future persistent implementation:

- `id`: unique room ID
- `host_id`: host identifier
- `created_at`: creation timestamp
- `is_active`: whether the room accepts joins
- `participant_count`: current participant count placeholder for the realtime layer

The realtime media server also keeps playback, participants, chat history, and Meet signaling state in memory. Uploaded files are stored on the media service disk, so Render free-service storage should be treated as temporary.

## Production Build

Build the client with:

```bash
npm run build
```

Start the API in production mode with:

```bash
npm --prefix server start
```

The client build output is generated in `client/dist/` and should not be committed.

## Deployment

The recommended production layout is:

- Vercel: deploy the `client/` directory as the Vite frontend.
- Render: deploy `server/` as the API service.
- Render: deploy the repository root as the media and Socket.IO service.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact Render commands, Vercel settings, and production environment variables:

```env
VITE_API_URL=https://your-api-service.onrender.com
VITE_MEDIA_URL=https://your-media-service.onrender.com
```

Render supplies the production `PORT`, commonly `10000`; do not hardcode the local development ports in production.

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

The older `client/src/services/socket.js` mock service can remain for reference, but the room page uses `client/src/services/mediaSocket.js`.
