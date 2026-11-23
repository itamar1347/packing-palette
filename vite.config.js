import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works on GitHub Pages under /packing-palette/
export default defineConfig({
  base: './',
  plugins: [react()],
});
