# Deployment Guide

This project is deployed as an efficient two-part stack:

- **Vercel**: Frontend React app (fast, global CDN, never sleeps)
- **Render**: Unified Backend service (handles REST API, Room Registry, Socket.IO, media streaming & Meet signaling)

---

## 1) Prerequisites

- GitHub repository pushed to GitHub
- Vercel account
- Render account
- (Optional) UptimeRobot account (to keep Render awake 24/7)

---

## 2) Deploy the Unified Backend on Render

Deploy a single Web Service on Render:

- **Root directory**: `.` (leave empty or set to repository root)
- **Environment**: Node
- **Build command**: `npm install`
- **Start command**: `npm run start` (or `node src/mediaServer.cjs`)

Environment variables:

```env
PORT=10000
```

After deployment, copy your public service URL, for example:

```text
https://play-together-backend.onrender.com
```

---

## 3) Set Up UptimeRobot (Keep Awake 24/7)

Render's free tier provides **750 free instance hours/month**. With 1 unified service running 24/7:
$$1 \text{ service} \times 24 \text{ hours} \times 31 \text{ days} = 744 \text{ hours} \le 750 \text{ hours}$$
Your single service stays awake the entire month without exhausting your free allowance!

1. Go to [UptimeRobot.com](https://uptimerobot.com) and sign in.
2. Click **+ Add New Monitor**.
3. **Monitor Type**: `HTTP(s)`
4. **Friendly Name**: `Play Together Health`
5. **URL (or IP)**: `https://play-together-backend.onrender.com/health`
6. **Monitoring Interval**: `Every 10 minutes` (or `Every 14 minutes`; Render sleeps after 15 minutes of inactivity).
7. Click **Create Monitor**.

---

## 4) Deploy the Frontend on Vercel

1. Import the repository into Vercel.
2. Set the **Root Directory** to `client`.
3. Framework: **Vite**
4. Build command: `npm install && npm run build`
5. Output directory: `dist`
6. Add these environment variables (both point to your single Render URL):

```env
VITE_API_URL=https://play-together-backend.onrender.com
VITE_MEDIA_URL=https://play-together-backend.onrender.com
```

7. Click **Deploy**.

---

## 5) Production Verification

After deployment, verify everything works:

- Backend Health Check: `https://play-together-backend.onrender.com/health`
  - Should return: `{"ok":true,"service":"play-together-unified",...}`
- Room Validation API: `https://play-together-backend.onrender.com/api/rooms/TEST/exists`
- Frontend loads on Vercel and can create/join rooms and stream media over WebSockets.

---

## 6) Important Notes

- **Single Service Advantage**: Running both REST API and Socket.IO in a single service prevents out-of-sync room states and fits within Render's 750 hours/month free quota.
- **Ephemeral Storage**: Uploaded media files in `media/` are stored on Render's ephemeral disk. If the server restarts or is redeployed, uploaded files reset. For persistent files across redeploys, consider integrating Cloudflare R2 or Supabase Storage.


