import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base muss dem Repo-Namen entsprechen, damit Assets unter
// https://<username>.github.io/BuildPlaner/ korrekt geladen werden.
export default defineConfig({
  base: '/BuildPlaner/',
  plugins: [react()],
})
