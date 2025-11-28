import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',          // Projektwurzel
  publicDir: 'public', // Ordner mit index.html
  server: {
    port: 5173,
    open: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
});