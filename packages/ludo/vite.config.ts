import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/packages/ludo/' : '/',
    plugins: [
        react(),
        federation({
            name: "ludo",
            filename: "remoteEntry.js",
            exposes: {
                "./Ludo": "./src/Ludo.tsx",
            },
            shared: ["react", "react-dom", "@xstate/react", "xstate"],
        }),
    ],
    server: {
        port: 5002,
        cors: true,
    },
    preview: {
        port: 5002,
        cors: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "../../src"),
        },
    },
    build: {
        modulePreload: false,
        target: "esnext",
        cssCodeSplit: false,
    },
}));
