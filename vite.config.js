import { defineConfig } from 'vite';

// Honor the harness-assigned port when launched via .claude/launch.json
// (autoPort sets PORT); fall back to Vite's default otherwise.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: Boolean(process.env.PORT),
  },
});
