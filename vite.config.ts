import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/** @see https://vite.dev/config/ */
export default defineConfig({
  plugins: [vue()],
  /** `host: true`：局域网设备可通过本机 IP 访问 dev server */
  server: {
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
