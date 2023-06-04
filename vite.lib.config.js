import {defineConfig} from 'vite'
import path from "path";
import dts from "vite-plugin-dts"

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
    plugins: [dts()],
    publicDir: "libPublic",
    build: {
        outDir: "dist/lib",
        lib: {
            entry: path.resolve(__dirname, 'src/lib/main.ts'),
            name: 'BABYLON.MMD',
            fileName: (format) => `index.${format}.js`,
            formats: ["es", "umd"]
        },
        rollupOptions: {
            external: ["@babylonjs/core"],

            output: {
                globals: {
                    "@babylonjs/core": "BABYLON"
                }
            },
        },
        esbuild: {
            drop: ['console', 'debugger'],
        },
    }
}))
