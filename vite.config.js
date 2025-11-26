import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    plugins: [react()],
    base: mode === 'development' ? '/' : (process.env.VITE_BASE_PATH || '/FACEIT-Compare/'),
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api/faceit': {
          target: 'https://open.faceit.com/data/v4',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/faceit/, ''),
          secure: false,
        }
      }
    }
  }
})
