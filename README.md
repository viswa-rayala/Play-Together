# Play Together 🎬🎧

Play Together is a fullstack web application for synchronized, multi-device media rooms. A host creates a room, shares a 6-character room ID, and friends can join for frame-accurate synchronized audio/video playback, real-time chat, playlist queueing, and peer-to-peer WebRTC video calls — all without requiring an account or login.

---

## 🏛️ System Architecture

```text
                                 ┌─────────────────────────────────┐
                                 │       Client Application        │
                                 │     React 18 + Vite + CSS3      │
                                 │      (Hosted on Vercel)         │
                                 └───────────────┬─────────────────┘
                                                 │
                                 ┌───────────────┴─────────────────┐
                                 │      HTTPS / WSS Transport      │
                                 └───────────────┬─────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
                   ▼                                                           ▼
    ┌─────────────────────────────┐                             ┌─────────────────────────────┐
    │    REST API & Streaming     │                             │    Real-Time WebSocket      │
    │     Express.js Routes       │                             │      Socket.IO Engine       │
    ├─────────────────────────────┤                             ├─────────────────────────────┤
    │ • GET /health (UptimeRobot) │                             │ • NTP Multi-Sample TimeSync │
    │ • POST /api/rooms/create    │                             │ • Future Scheduled Play/Seek│
    │ • GET /api/rooms/:id/exists │                             │ • Controller Delegation     │
    │ • POST /upload (Multer)     │                             │ • Live Room Chat (Cap: 100) │
    │ • GET /media/:file (Range)  │                             │ • WebRTC Signaling (Meet)   │
    └──────────────┬──────────────┘                             └──────────────┬──────────────┘
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 │
                                  ┌──────────────┴──────────────┐
                                  │      State & Persistence    │
                                  ├─────────────────────────────┤
                                  │ • In-Memory (Zero Latency)  │
                                  │ • Optional Supabase / SQL   │
                                  └─────────────────────────────┘
```

---

## 📁 Project Directory Structure

```text
Play-Together/
├── client/                      # Frontend Application (React + Vite)
│   ├── public/                  # Public assets (favicons, manifests)
│   ├── src/
│   │   ├── assets/              # Icons, badges, and SVG illustrations
│   │   ├── components/          # Reusable UI widgets
│   │   │   ├── AdminControls.jsx    # Host/co-host media upload & queue manager
│   │   │   ├── ChatBox.jsx          # Real-time room chat component
│   │   │   ├── ConnectionStatus.jsx # WebSocket live status pill
│   │   │   ├── MediaPlayer.jsx      # Low-drift audio/video player with PLL
│   │   │   ├── MeetBox.jsx          # WebRTC video call floating modal
│   │   │   ├── PassengerPanel.jsx   # Participant list & role delegation
│   │   │   └── RoomInfo.jsx         # Room ID and invitation links
│   │   ├── pages/               # Top-level view routes
│   │   │   ├── Home.jsx             # Landing page
│   │   │   ├── CreateRoom.jsx       # Room creation view
│   │   │   ├── JoinRoom.jsx         # Room join view
│   │   │   └── Room.jsx             # Active room dashboard
│   │   ├── services/            # Networking & state bridges
│   │   │   ├── api.js               # REST client for room registration
│   │   │   └── mediaSocket.js       # Socket.IO client, NTP calibration & sync
│   │   └── styles/              # Scoped CSS stylesheets
│   ├── .env.example             # Client environment template
│   ├── package.json             # Frontend dependencies
│   └── vite.config.js           # Vite build configuration
│
├── server/                      # Backend Service (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── config/              # Centralized environment & app settings
│   │   │   └── index.js             # Ports, paths, and scheduling constants
│   │   ├── controllers/         # HTTP request controllers
│   │   │   ├── roomController.js    # Health check, room create & validate
│   │   │   └── mediaController.js   # File upload & HTTP 206 range streaming
│   │   ├── middleware/          # Express middleware
│   │   │   ├── cors.js              # Cross-origin request headers
│   │   │   └── upload.js            # Multer storage configuration
│   │   ├── routes/              # Express route declarations
│   │   │   ├── roomRoutes.js        # /api/rooms/* and /health
│   │   │   └── mediaRoutes.js       # /upload and /media/*
│   │   ├── services/            # Core business logic & in-memory models
│   │   │   └── roomService.js       # Room states, host succession, NTP math
│   │   ├── sockets/             # Real-time event orchestration
│   │   │   └── socketHandler.js     # Socket.IO connection, playback, chat, meet
│   │   ├── app.js               # Express app configuration
│   │   └── server.js            # Main HTTP & Socket.IO server entrypoint
│   ├── media/                   # Runtime uploaded media files (gitignored)
│   ├── .env.example             # Server environment template
│   └── package.json             # Backend dependencies
│
├── database/                    # Database Architecture & Migration Scripts
│   ├── schema.sql               # PostgreSQL tables, indexes & RLS policies
│   └── README.md                # Supabase database setup instructions
│
├── render.yaml                  # Infrastructure-as-code for Render deployment
├── DEPLOYMENT.md                # Production guide (Render + Vercel + UptimeRobot)
└── package.json                 # Monorepo root scripts & dev orchestration
```

---

## ✨ Key Features & Technical Details

### 1. Unified Single-Service Backend
* **Render Free Tier Optimized**: The REST API and Socket.IO real-time media engine run in a single Node.js process on the same HTTP port.
* **Keep-Alive Ready**: With 1 service kept awake 24/7 via UptimeRobot, monthly usage is $\approx 744 \text{ hours}$, safely within Render's 750 free monthly hours.
* **Shared In-Memory State**: Room validation and WebSocket connections share the same memory space, preventing ghost rooms or state divergence.

### 2. Synchronized Playback Engine (Beatsync Architecture)
* **Future-Scheduled Playback (`scheduledAt` Lead Window)**:
  * Eliminates start lag. When the host hits Play, playback is scheduled **200 ms into the future** (`scheduledAt = serverTime + 200ms`).
  * Browsers pre-cue decoders (`el.currentTime = position`) during the lead window.
  * A precision timer triggers `el.play()` on all devices at the exact same physical millisecond.
* **NTP Multi-Sample Calibration with Outlier Rejection**:
  * Clients send a burst of 8 rapid ping packets (`TIME_REQUEST` / `TIME_RESPONSE`) on connect.
  * Sorts samples by lowest round-trip latency, discarding outliers (Wi-Fi spikes, cellular jitter).
  * Continues periodic 4-ping calibration every 8s, using Exponential Moving Average (EMA: $0.65 \cdot \text{prev} + 0.35 \cdot \text{new}$) to adapt to hardware crystal clock drift.
* **Phase-Locked Loop (PLL) Soft Drift Correction**:
  * **Drift $\le$ 30 ms**: Dead-band (perfect lockstep; pitch unchanged).
  * **30 ms $<$ Drift $\le$ 1.2 s**: Proportional playback rate adjustment (`0.96x – 1.04x`) with `preservesPitch = true`. Realignment happens seamlessly without audio stutters or pitch warping.
  * **Drift $>$ 1.2 s**: Hard seek for severely stalled clients.
* **HTTP 206 Partial Content Streaming**: Uploaded media streams via standard byte-range requests, enabling instant scrubbing on large files.

### 3. Room Authority & Security
* **Single Host Authority**: Exactly one **👑 Host** per room. Joiners are designated as Viewers.
* **Co-Host Control Delegation**: The Host can delegate playback control to any participant.
* **Graceful Host Succession**: If the Host leaves or disconnects, the server automatically promotes the next active participant to Host.
* **Kick / Remove Participants**: The Host can kick disruptive users with instant revocation.

### 4. Real-Time Chat & WebRTC Video Meet
* **Chat**: In-room live chat with automatic deduplication (`clientMessageId`) and 100-message memory buffer.
* **Video Meet**: In-room peer-to-peer WebRTC video overlay with camera switching, mute/unmute, and STUN connectivity.

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
* **Node.js** v18+ (Node 20 or 22 recommended)
* **npm** v9+

### 2. Installation
Clone the repository and install all dependencies (root, backend, and frontend) in one command:

```bash
git clone https://github.com/viswa-rayala/Play-Together.git
cd Play-Together
npm run install:all
```

### 3. Run Locally

Start both the backend server and frontend Vite dev server concurrently:

```bash
npm run dev
```

* **Frontend**: `http://localhost:5173`
* **Unified Backend**: `http://localhost:3000`
* **Health Check**: `http://localhost:3000/health`

---

## 📡 REST API Reference

### Health Check
```http
GET /health
```
```json
{
  "ok": true,
  "service": "play-together-unified",
  "timestamp": 1792156981834
}
```

### Create Room
```http
POST /api/rooms/create
Content-Type: application/json

{
  "roomId": "ABC123",
  "hostId": "HostName"
}
```
* `roomId` is optional (auto-generated if omitted).
* Returns `201 Created` with `{ "success": true, "roomId": "ABC123" }`.

### Validate Room
```http
GET /api/rooms/:roomId/exists
```
```json
{
  "valid": true,
  "exists": true
}
```

### Media Upload
```http
POST /upload
Content-Type: multipart/form-data
```
* Saves files to `media/` directory.
* Returns `{ "success": true, "media": "track.mp3", "files": ["track.mp3"] }`.

### Byte-Range Stream
```http
GET /media/:file
Range: bytes=0-1048576
```
* Returns `206 Partial Content` with `Content-Range` header.

---

## 🌐 WebSocket Events Summary

| Event | Direction | Payload | Description |
|---|---|---|---|
| `TIME_REQUEST` | Client $\to$ Server | `{ clientTime }` | NTP clock sync ping |
| `TIME_RESPONSE`| Server $\to$ Client | `{ serverTime, clientTime }` | NTP timestamp response |
| `ROOM_STATE`   | Server $\to$ Client | `{ media, playlist, position, playing, participants, ... }` | Full room state on join |
| `PLAY`         | Client $\leftrightarrow$ Server | `{ position, serverTime, scheduledAt }` | Synchronized play command |
| `PAUSE`        | Client $\leftrightarrow$ Server | `{ position }` | Synchronized pause command |
| `SEEK`         | Client $\leftrightarrow$ Server | `{ position, serverTime, scheduledAt, playing }` | Synchronized seek command |
| `SYNC`         | Client $\to$ Server | `{ position, playing, serverTime }` | Controller heartbeat |
| `CHAT_MESSAGE` | Client $\leftrightarrow$ Server | `{ message, clientMessageId }` | In-room text chat |
| `MEET_SIGNAL`  | Client $\leftrightarrow$ Server | `{ targetId, signal }` | WebRTC peer signaling |
| `HOST_CHANGED` | Server $\to$ Client | `{ hostId, hostName, participants }` | Host succession notification |

---

## 📦 Production Deployment

The project is structured to deploy on:
* **Frontend**: [Vercel](https://vercel.com) (Root directory: `client`)
* **Backend**: [Render](https://render.com) (Root directory: `.`, Start: `npm run start`)
* **Uptime Keep-Alive**: [UptimeRobot](https://uptimerobot.com) (Pings `https://your-backend.onrender.com/health` every 10–14m)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step instructions.

---

## 📄 License

ISC License. Built for seamless shared media experiences.
