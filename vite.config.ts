
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensures process.env is available for Firebase/API keys if needed in some environments
    'process.env': process.env
  }
});
