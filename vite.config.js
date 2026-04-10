import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 개발 서버 미들웨어가 같은 .env 값을 읽을 수 있게 서버 환경변수로도 맞춰둡니다.
  if (!process.env.OPENAI_API_KEY && env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY
  }

  // 기존 프론트 직결 키를 그대로 둔 로컬 환경도 임시로 함께 지원합니다.
  if (!process.env.VITE_OPENAI_API_KEY && env.VITE_OPENAI_API_KEY) {
    process.env.VITE_OPENAI_API_KEY = env.VITE_OPENAI_API_KEY
  }

  return {
    plugins: [
      vue(),
      vueDevTools(),
      {
        name: 'local-report-api',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use('/api/report', async (req, res, next) => {
            if (req.method !== 'GET') {
              next()
              return
            }

            try {
              const { handleReportApi } = await import('./src/server/reportApi.js')
              await handleReportApi(req, res)
            } catch (error) {
              console.error('Failed to handle /api/report.', error)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  message: 'Failed to build AI report.',
                }),
              )
            }
          })
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }
})
