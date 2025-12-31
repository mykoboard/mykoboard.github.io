import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: './docs',
    emptyOutDir: true, // also necessary
    target: 'esnext'
  },
  plugins: [
    react(),
    federation({
      name: "host",
      remotes: {
        "tic-tac-toe": mode === 'development'
          ? "http://localhost:5001/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/tic-tac-toe/dist/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom", "@xstate/react", "xstate"],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
