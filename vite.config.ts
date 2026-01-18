import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable minification for production
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
        // Chunk splitting for better caching
        rollupOptions: {
          output: {
            manualChunks: {
              // Vendor chunk for React
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              // UI libraries chunk
              'vendor-ui': ['lucide-react'],
            },
          },
        },
        // Target modern browsers for smaller bundles
        target: 'es2020',
        // Generate source maps for debugging (optional, remove for smaller builds)
        sourcemap: false,
        // Chunk size warning limit
        chunkSizeWarningLimit: 500,
      },
      // Optimize dependencies
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
      },
    };
});
