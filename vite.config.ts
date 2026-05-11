import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 同一 WiFi 下手机 / iPad 用局域网 IP 访问本机开发服务（终端会打印 Network 地址）
  server: {
    host: true,
  },
})
