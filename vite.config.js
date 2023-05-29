import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => ({
    plugins: [vue()],
    build: {
        outDir: "dist/example"
    },
    esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
}))
