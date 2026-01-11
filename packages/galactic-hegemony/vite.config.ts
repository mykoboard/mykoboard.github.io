import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/packages/galactic-hegemony/' : '/',
    plugins: [
        react(),
        federation({
            name: "galactic-hegemony",
            filename: "remoteEntry.js",
            exposes: {
                "./GalacticHegemony": "./src/GalacticHegemony.tsx",
            },
            shared: ["react", "react-dom", "@xstate/react", "xstate", "@mykoboard/integration"],
        }),
    ],
    server: {
        port: 5003,
        cors: true,
    },
    preview: {
        port: 5003,
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
