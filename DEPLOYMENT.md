# Deployment Guide

This project is best deployed as a three-part stack:

- Vercel: frontend React app
- Render: Express API
- Render: Socket.IO media server
- Supabase: database

## 1) Prerequisites

- GitHub repository pushed to GitHub
- Vercel account
- Render account
- Supabase project already created

## 2) Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run the schema from `server/schema.sql`.
3. Copy the project URL and service role key.
4. Keep the service role key secret and never expose it in the frontend.

## 3) Deploy the API service on Render

Create a new Web Service on Render with:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm run start`

Environment variables:

```env
PORT=10000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

After deployment, copy the public URL, for example:

```text
https://play-together-api.onrender.com
```

## 4) Deploy the media service on Render

Create another Web Service on Render with:

- Root directory: `.`
- Build command: `npm install`
- Start command: `npm run media:prod`

Environment variables:

```env
PORT=10000
```

After deployment, copy the public URL, for example:

```text
https://play-together-media.onrender.com
```

## 5) Deploy the frontend on Vercel

Import the repository into Vercel.

Set the project root to the `client` folder.

Framework: Vite
Build command: `npm install && npm run build`
Output directory: `dist`

Add these environment variables:

```env
VITE_API_URL=https://play-together-api.onrender.com
VITE_MEDIA_URL=https://play-together-media.onrender.com
```

## 6) Production verification

After deployment, verify all services respond:

- API health: `https://your-api-url/health`
- Media service root: `https://your-media-url/`
- Frontend homepage loads in Vercel

## 7) Notes

- Do not put `SUPABASE_SERVICE_ROLE_KEY` into the client app.
- The media server needs a public URL because the browser connects to it directly.
- The API and media services should be deployed as separate services because they are independent Node apps.
