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
                               |  NTP clock calibration & scheduled future playback
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

### Room Management & Roles

- **Single Host Authority:** The server strictly enforces one **👑 Host** per room. Even if participants join via a link containing `?host=true`, the server assigns only the initial creator as Host and designates all subsequent joiners as Viewers, preventing playback conflicts.
- **Graceful Host Succession:** If the active host leaves or disconnects while other participants remain in the room, the server automatically promotes the next participant (or active co-host) to **Host**, ensuring the room and playback never stall.
- **Removing / Kicking Participants:** The host can remove any participant from the room at any time using the **✕** button in the Participants list (with confirmation). The removed participant receives an immediate notification and is safely redirected.
- **Three-Tier Role Visibility:** Clear badges are displayed across both host and passenger panels:
  - **👑 Host**: Room owner with full control (upload files, switch tracks, manage playlist, grant/revoke co-host control, kick users).
  - **🎮 Co-Host**: Participants delegated playback control by the host (can play, pause, seek, and select tracks).
  - **👤 Viewer**: Synchronized listeners/viewers with a read-only seek bar and live room visibility.
- **Host** creates a room with a custom or auto-generated 6-character alphanumeric ID.
- **Participants** join by entering the shared room ID and a display name.
- Room IDs are validated for format (A-Z, 0-9, 4-10 characters).
- **Free-Tier Server Spin-Up (10–20s):** On free hosting providers such as Render, web services automatically go to sleep after 15 minutes of inactivity. When creating a room after an idle period, the initial request may take approximately 10 to 20 seconds while the server wakes up.


### Synchronized Playback (Beatsync-Inspired Low-Drift Engine)

Play Together incorporates advanced multi-device synchronization techniques inspired by [Beatsync.gg](https://beatsync.gg) to keep video and audio in lockstep across phones, laptops, and tablets:

- **Future-Scheduled Playback (`scheduledAt` Lead Window):**
  - Standard web players suffer from start latency: when the host clicks Play, the host starts instantly while viewers lag by 150–250ms due to network transit and decoder warmup.
  - Play Together solves this by scheduling playback **200 ms into the future** (`scheduledAt = serverTime + 200ms` for play, `150ms` for seek).
  - During this lead window, both host and viewer browsers pre-cue `el.currentTime = position` to prime their hardware media decoders.
  - A high-precision countdown timer fires `el.play()` on all devices at the **exact same physical millisecond**, achieving true simultaneous start.
- **Multi-Sample NTP Burst Calibration with Outlier Rejection:**
  - Upon connecting, clients execute a burst of **8 rapid pings** (spaced 35ms apart) over WebSockets (`TIME_REQUEST` / `TIME_RESPONSE`).
  - Network jitter, Wi-Fi spikes, and mobile queuing delays are filtered out by sorting samples by lowest Round-Trip Time (RTT) and selecting the top 50% lowest-latency samples.
  - Background calibration runs a 4-ping check every 8 seconds, utilizing an **Exponential Moving Average (EMA)** (`offset = 0.65 * previous + 0.35 * new`) to smoothly adapt to crystal clock skew without sudden playback jumps.
- **Tight Phase-Locked Loop (PLL) Soft Drift Correction:**
  - Controllers broadcast live position via `SYNC` events every 800 ms.
  - **Drift <= 30 ms:** Dead-band (considered in perfect lockstep; prevents speed jitter and flutter).
  - **30 ms < Drift <= 1.2 s:** Proportional playback rate adjustment (`0.96x – 1.04x`) with `preservesPitch = true`. The player imperceptibly speeds up or slows down to pull back into phase without audible pitch shifting, skips, or clicks.
  - **Drift > 1.2 s:** Hard seek (realigns viewer if network stalls or mobile screen was locked).
- **HTTP Byte-Range Streaming:** Uploaded files stream via HTTP 206 partial-content requests, enabling instantaneous scrubbing and random seeks on large media files.

### Playlist Queue

- Multiple files can be uploaded and queued in a shared **playlist**.
- Host/co-host can switch tracks, remove tracks, or let playback auto-advance to the next track when the current one ends.
- Playlist state is broadcast to all participants in real time.

### Co-Host Control Delegation

- The host can grant or revoke **playback control** to any participant at any time via the Participants panel ("Give Control" / "Revoke Control").
- Co-hosts can play, pause, seek, switch tracks, upload files, and manage the playlist.
- Participants without control see a read-only viewer view synchronized with the room controller.

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

### Media Player UI & Mobile Experience

- **Adaptive Video Stage vs. Audio Dock:**
  - **Video (`.mp4`, `.webm`, `.mov`):** Renders in an expanded cinematic stage format front-and-centre for an optimal watch-party experience.
  - **Audio (`.mp3`, `.wav`, `.aac`):** Displays a central glowing visualizer ambient card while dock controls remain cleanly anchored at the bottom.
- **Full Song Title Visibility (No Mobile Truncation):**
  - **Stage Ambient Card:** Multiline title wrapping ensures even exceptionally long filenames wrap cleanly across lines in the middle of the screen.
  - **Two-Tier Mobile Player Dock (`<=768px`):** Top row allocates 100% full width to track art, live status badge, and track name (2-line wrap); bottom row houses edge-to-edge playback buttons, progress slider, and duration timers.
  - **Tap-to-Expand Title (`.show-full`):** Tapping the song title toggles full filename expansion without clipping.
  - **Expanded Desktop Dock:** Increased track title width capacity (up to 380px).
- **Accent Colour Picker:** Each user can personalise the player highlight colour locally.
- **Previous / Next Track Buttons:** Seamless playlist skipping for hosts and co-hosts.
- **Autoplay Permission Helper:** Browsers blocking unmuted autoplay display a one-tap "Start Playback" prompt so mobile users can sync instantly.

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

---

> **Note on "No Internet Required" (LAN Compatibility)**  
> Play Together is designed so that it can run entirely on a Local Area Network (LAN). If you host the API and Media server locally (`npm run dev`), devices on the same WiFi network can connect using your local IP address. Media streaming and WebRTC video calls route directly over your local router at maximum local speeds, without consuming any internet bandwidth.  
> *Tip for Mobile Meet Testing:* Mobile browsers require a secure context for camera/mic access. To test video Meet over local HTTP without internet, enable `unsafely-treat-insecure-origin-as-secure` under `chrome://flags` or `brave://flags` and enter your PC's local network URL (e.g. `http://192.168.x.x:5173`).
