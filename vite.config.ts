import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import vue from "@vitejs/plugin-vue";
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
    vue(),
    react(),
    federation({
      name: "host",
      remotes: {
        "tic-tac-toe": mode === 'development'
          ? "http://localhost:5001/packages/tic-tac-toe/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/tic-tac-toe/assets/remoteEntry.js",
        "ludo": mode === 'development'
          ? "http://localhost:5002/packages/ludo/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/ludo/assets/remoteEntry.js",
        "galactic-hegemony": mode === 'development'
          ? "http://localhost:5003/packages/galactic-hegemony/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/galactic-hegemony/assets/remoteEntry.js",
        "planning-poker": mode === 'development'
          ? "http://localhost:5004/packages/planning-poker/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/planning-poker/assets/remoteEntry.js",
        "apex-nebula": mode === 'development'
          ? "http://localhost:5005/packages/apex-nebula/assets/remoteEntry.js"
          : "https://mykoboard.com/packages/apex-nebula/assets/remoteEntry.js",
      },
      shared: ["vue", "react", "react-dom", "@xstate/react", "@xstate/vue", "xstate", "@mykoboard/integration"],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
