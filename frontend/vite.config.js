import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configure the dev-server to allow access via ngrok (or other remote tunnels)
  server: {
    host: true, // listen on all addresses, including LAN & tunnel addresses
    allowedHosts: ['ed989ca1972a.ngrok-free.app'], // add your ngrok host here
  },
})
