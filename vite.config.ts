import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from 'fs';
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [vue()],
    build: {
        target: 'modules'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/')
        }
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1000,
        strictPort: true,
        host: host || false,
        hmr: host ? {
            protocol: "ws",
            host,
            port: 1001,
        } : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
        https: {
            key: readFileSync('localhost.key'),
            cert: readFileSync('localhost.crt')
        }
    }
}));
