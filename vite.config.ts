import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { existsSync, readFileSync } from 'fs';
import { resolve } from "path";

import pack from './package.json';

const host = process.env.TAURI_DEV_HOST;
const customElements = [
    'trix-editor',
    'trix-toolbar',
    'align-left',
    'align-center',
    'align-right',
    'align-justified'
];

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
        } : undefined,
        headers: {
            // 'content-security-policy': "default-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://webcama1.watching-grass-grow.com/current.jpg;",
            // 'cache-control': 'public, max-age=43200'
        }
    }
}));
