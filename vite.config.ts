import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { existsSync, readFileSync } from 'fs';
import { resolve } from "path";

import pack from './package.json';

const host = process.env.TAURI_DEV_HOST;
const customElements = ['trix-editor', 'trix-toolbar'];

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [vue({
        template: {
            compilerOptions: {
                isCustomElement: (tag) => customElements.includes(tag)
            }
        }
    })],
    define: {
        __VERSION__: JSON.stringify(pack.version),
    },
    build: {
        target: 'modules',
        // lower this because why not
        assetsInlineLimit: 2048,
        // rollupOptions: { output: { sourcemap: true } }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/')
        }
    },
    assetsInclude: [
        'src/**/*.html' // importing html for Trix editor
    ],
    // prevent vite from obscuring rust errors
    clearScreen: false,
    server: {
        port: 1000,
        strictPort: true,
        host: host || false,
        hmr: false, // HMR causes issues when some files are edited
        watch: {
            ignored: ["**/src-tauri/**"],
        },
        https: existsSync('localhost.key') ? {
            key: readFileSync('localhost.key'),
            cert: readFileSync('localhost.crt')
        } : undefined
    }
}));
