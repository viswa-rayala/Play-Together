import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // exposes on local network so phones on same Wi-Fi can connect
    port: 5173,
  },
})
