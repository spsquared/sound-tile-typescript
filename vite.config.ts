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
const srcDir = resolve(__dirname, 'src/');

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
        __VERSION__: JSON.stringify(pack.version)
    },
    build: {
        target: 'baseline-widely-available',
        assetsInlineLimit: 2048, // lower this because why not
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                loadingBar: resolve(srcDir, 'loadingBar.js'),
                serviceWorker: resolve(srcDir, 'serviceWorker.ts')
            },
            output: {
                dir: resolve(__dirname, 'dist/'),
                entryFileNames: (chunk) => {
                    switch (chunk.name) {
                        case 'loadingBar': return `loadingBar.js`;
                        case 'serviceWorker': return `serviceWorker.js`;
                        case 'index': return 'assets/[name]-[hash].js';
                    }
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            },
        }
    },
    resolve: {
        alias: {
            '@': srcDir,
            '/loadingBar.js': resolve(srcDir, 'loadingBar.js') // need this workaround now
        }
    },
    assetsInclude: [
        resolve(srcDir, 'assets/*.html') // importing html for Trix editor
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
            // emulating headers of firebase deployment
            'Content-Security-Policy': "default-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://webcama1.watching-grass-grow.com/current.jpg https://webcamb2.watching-grass-grow.com/current.jpg https://www.watching-grass-grow.com/watching-grass-grow.gif;",
            // 'Cross-Origin-Opener-Policy': 'same-origin',
            // 'Cross-Origin-Embedder-Policy': 'require-corp',
            // 'Permissions-Policy': "cross-origin-isolated=self",
            // 'Cache-Control': 'public, max-age=43200'
        }
    }
}));
