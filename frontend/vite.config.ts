import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // 开发期把 /api 转发给 FastAPI，业务代码里永远写相对路径，不用配 baseURL
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
  build: {
    // 直接产出到后端的静态目录：npm run build 之后单端口就能跑，main.py 不用动
    outDir: '../app/static',
    emptyOutDir: true,
  },
})
