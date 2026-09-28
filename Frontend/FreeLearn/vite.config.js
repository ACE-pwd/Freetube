import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(['/api', '/login', '/signup', '/me', '/users', '/health'].map(path => [path, {
      target: 'http://127.0.0.1:3000',
      // Page navigation stays in Vite; JSON requests go to the API.
      bypass(req) {
        if (req.headers.accept?.includes('text/html')) return req.url
      },
    }])),
  },
})
