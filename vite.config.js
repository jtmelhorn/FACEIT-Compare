import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Use base path from env var, or default to root
  // GitHub Pages: VITE_BASE_PATH='/FACEIT-Compare/'
  // Netlify: VITE_BASE_PATH='/' (default)
  const base = process.env.VITE_BASE_PATH || '/';

  return {
    plugins: [react()],
    base: base,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': {
          target: 'https://open.faceit.com/data/v4',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Forward authorization header from original request
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
              }
            });
          }
        }
      }
    }
  }
})
