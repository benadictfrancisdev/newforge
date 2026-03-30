import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || "http://localhost:8000";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        // Dev proxy: /api/* → FastAPI backend (avoids CORS issues in dev)
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || "https://vebczmpouzpzzfalwsdm.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlYmN6bXBvdXpwenpmYWx3c2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5OTE2NDYsImV4cCI6MjA4NjU2NzY0Nn0.6FjpHOGQyvYJAklpmJDFCBHQ46fPKVt17BdFJlWtjvQ"),
      'import.meta.env.VITE_API_URL': JSON.stringify(backendUrl),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
    },
  };
});
