# Database Architecture & Setup

Play Together uses a high-performance **hybrid architecture**:

1. **Active Real-Time State (In-Memory)**:
   - Synchronized playback offsets, WebRTC signaling, live participants, chat history, and active playlists are managed in-memory on the backend server for sub-millisecond access and instant NTP clock synchronization.

2. **Persistent Room Storage (PostgreSQL / Supabase)** *(Optional)*:
   - For long-term historical room logs and user sessions across backend restarts, you can connect a PostgreSQL instance such as [Supabase](https://supabase.com).

---

## Schema Overview

The database schema is defined in [`schema.sql`](./schema.sql).

### Table: `rooms`

| Column | Type | Description |
|---|---|---|
| `id` | `text` | Primary Key. 4–10 character alphanumeric Room ID (e.g., `ABC123`). |
| `host_id` | `text` | Identifier or socket connection ID of the initial room host. |
| `created_at` | `timestamptz` | Room creation timestamp (default `now()`). |
| `is_active` | `boolean` | Status flag (`true` while the room has active members). |
| `participant_count` | `integer` | Count of currently connected peers. |

---

## Setup with Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Paste the contents of [`schema.sql`](./schema.sql) and click **Run**.
4. Retrieve your project credentials from **Project Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret, server-side only).
5. Add these credentials to your backend `.env` file if enabling persistent database syncing.
