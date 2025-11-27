
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Securely inject the API key.
    // Vercel exposes environment variables during the build process.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Fallback for other process.env access if necessary, but avoid exposing the whole object
    'process.env': {} 
  }
});
