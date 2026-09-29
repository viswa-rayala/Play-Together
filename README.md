# Play Together

Play Together is a React application for shared media rooms. A host creates a room, shares its 6-character ID, and other users join for synchronized video/audio playback, real-time chat, a media playlist queue, and an optional video Meet -- all without requiring any account or login.

## Architecture

```text
Browser (React + Vite)
   |
   |-- HTTP --> Express API (server/)
   |            Room creation and validation (in-memory)
   |
   +-- Socket.IO + HTTP --> Media Server (src/mediaServer.cjs)
                               |  File upload and byte-range streaming
                               |  Room playback state management
                               |  Real-time chat (latest 100 messages)
                               |  Playlist management
                               |  WebRTC Meet signaling
                               +-- WebRTC peer connections (browser to browser)
```

### Key directories

| Path | Purpose |
|---|---|
| `client/` | React + Vite frontend |
| `server/` | Express room-registry API |
| `src/mediaServer.cjs` | Socket.IO + media-streaming service |
| `media/` | Uploaded files (runtime, not committed) |
| `public/` | Static assets served by the media server |

---

## Features

### Room Management

- **Host** creates a room with a custom or auto-generated 6-character alphanumeric ID.
- **Participants** join by entering the shared room ID and a display name.
- Room IDs are validated for format (A-Z, 0-9, 4-10 characters).
- If the host disconnects, all participants are redirected to the home page.

### Synchronized Playback

- Hosts (and co-hosts) upload **video** (`.mp4`, `.webm`, `.ogg`) or **audio** (`.mp3`, `.wav`, `.ogg`) files.
- Files are streamed from the media server using **HTTP byte-range requests** for reliable seeking.
- Play, pause, and seek events are broadcast to all room members via Socket.IO.
- **NTP-style clock synchronisation** (`TIME_REQUEST` / `TIME_RESPONSE`) compensates for network latency so all clients share a common reference time.
- **Soft drift correction** (`SYNC` events emitted every 800 ms by the controller):
  - Drift **> 1.2 s** -- hard seek.
  - Drift **<= 40 ms** -- no action (dead-band, prevents speed oscillation).
  - Otherwise -- proportional `playbackRate` adjustment (+/-5%) for imperceptible catch-up/slow-down.
  - `preservesPitch` is set to avoid audio artefacts during speed adjustment.

### Playlist Queue

- Multiple files can be uploaded and queued in a shared **playlist**.
- Host/co-host can switch tracks, remove tracks, or let playback auto-advance to the next track when the current one ends.
- Playlist state is broadcast to all participants in real time.

### Co-Host Control Delegation

- The host can grant or revoke **playback control** to any participant at any time via the Participants panel.
- Co-hosts can play, pause, seek, switch tracks, upload files, and manage the playlist.
- Participants without control see a read-only viewer view.

### Real-Time Chat

- In-room chat with messages displayed as `Name: message`.
- Up to the latest **100 messages** are kept in memory and delivered to new joiners.
- Client-side deduplication using `clientMessageId` prevents ghost messages on send.

### Video Meet (WebRTC)

- Triggered by the camera-icon button in the room header; opens as a floating overlay.
- Can be dismissed without leaving the media room.
- Each participant can toggle **camera** and **microphone** independently.
- **Front/back camera switching** on mobile devices (`facingMode`).
- Remote participants appear as video tiles with name labels.
- Signaling is handled over the existing Socket.IO connection; media flows **peer-to-peer** via WebRTC (Google STUN server `stun.l.google.com:19302`).
- A TURN server may be needed for participants behind restrictive NATs/firewalls.
- The host can end the Meet for all participants.

### Media Player UI

- Docked **bottom-tab** player that can be expanded to a larger view or toggled to fullscreen.
- **Accent colour picker** -- each user can personalise the player highlight colour locally.
- Previous / Next track skip buttons appear when the playlist has more than one item.
- Autoplay-blocked browsers show a manual "Start playback" prompt for participants.

---

## Requirements

- Node.js 18 or newer
- npm
- A modern browser (Chrome, Firefox, Edge, Safari) with camera/microphone support for Meet

---

## Optional Supabase Persistence

The current room API uses an in-memory `Map`, so Supabase is **not required** for local development. `server/schema.sql` describes a Supabase table for a future persistent room registry. To enable it later, create `server/.env` from `server/.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
PORT=3001
```

Never commit `server/.env`. The service-role key must remain server-side only.

---

## Installation

From the repository root:

```bash
npm run install:all   # installs client/ and server/ dependencies
npm install           # installs root-level dependencies (concurrently, socket.io, multer)
```

---

## Development

Start all three services from the repository root:

```bash
npm run dev
```

| Service | Default URL |
|---|---|
| React frontend (Vite) | `http://localhost:5173` |
| Room API (Express) | `http://localhost:3001` |
| Media server (Socket.IO + streaming) | `http://localhost:3000` |

To start each service individually:

```bash
npm --prefix server run dev                         # Room API
npm --prefix client run dev -- --host 0.0.0.0       # React frontend (LAN accessible)
npm run media:dev                                   # Media server (hot-reloads with --watch)
```

If testing from another device on the same network, open the network URL printed by Vite. The frontend auto-detects the browser hostname for the local media server; override with `VITE_MEDIA_URL` if needed.

For Meet camera and microphone access, browsers require HTTPS outside of localhost. Localhost is allowed during development; configure HTTPS or a reverse proxy in production.

---

## Client Environment

Copy `client/.env.example` and customise if the services are hosted at non-default URLs:

```env
VITE_API_URL=http://localhost:3001
VITE_MEDIA_URL=http://localhost:3000
```

Do **not** put any secret keys in the client environment -- they are exposed to the browser.

---

## Room API

### Health check

```http
GET /health
```

```json
{ "ok": true, "service": "play-together-server" }
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

`roomId` is optional -- a 6-character ID is auto-generated when omitted.

Returns `201` with `{ "success": true, "roomId": "ABC123" }`.
Returns `409` when the room ID already exists.
Returns `400` for invalid room ID format.

### Validate a room

```http
GET /api/rooms/:roomId/exists
```

```json
{ "valid": true, "exists": true }
```

---

## Room and Playback State

All state is held **in memory** in the media server process:

| State | Description |
|---|---|
| `media` | Filename of the currently playing track |
| `playlist` | Ordered list of uploaded filenames |
| `controllers` | Socket IDs with co-host control |
| `position` | Playback position in seconds at last state change |
| `playing` | Boolean play/pause flag |
| `updatedAt` | Timestamp of last state change (used for live position calculation) |
| `participants` | `[{ id, name }]` -- live room members |
| `messages` | Latest 100 chat messages |

Uploaded files are stored on disk under `media/`. On Render free-tier, ephemeral storage means files disappear on redeploy.

---

## Production Build

Build the React client:

```bash
npm run build
```

Output is written to `client/dist/` (not committed).

Start the API in production mode:

```bash
npm --prefix server start
```

Start the media server in production mode:

```bash
npm run media:prod
```

---

## Deployment

Recommended layout:

| Service | Platform | Source |
|---|---|---|
| React frontend | Vercel | `client/` directory |
| Room API | Render (web service) | `server/` |
| Media server | Render (web service) | Repository root (`npm run media:prod`) |

Set these environment variables on Vercel for the client build:

```env
VITE_API_URL=https://your-api-service.onrender.com
VITE_MEDIA_URL=https://your-media-service.onrender.com
```

Render injects `PORT` automatically; do not hardcode `3000` or `3001` in production.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the exact Render commands and settings.

---

## Git and Secrets

The root `.gitignore` excludes:

- `server/.env` and all `.env` files
- `node_modules/` folders
- `client/dist/` build output
- Uploaded `media/` files
- Logs and editor files

Committed templates are safe placeholders:

- `client/.env.example`
- `server/.env.example`
- `.env.production.example`

Before pushing, verify `server/.env` is not listed by `git status`. If a service-role key is ever exposed, revoke it in Supabase immediately and generate a replacement.
