import express from 'express'
import cors from 'cors'
import { analyzeLp } from './analyzer'

const app = express()
const PORT = process.env.PORT || 3001

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  })
)
app.use(express.json())

// サービス認証ミドルウェア
app.use((req, res, next) => {
  // ヘルスチェックは認証スキップ
  if (req.path === '/health') return next()

  const secret = req.headers['x-service-secret']
  if (secret !== process.env.PLAYWRIGHT_SERVICE_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// LP解析エンドポイント
app.post('/analyze', async (req, res) => {
  const { url } = req.body

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' })
    return
  }

  // URL形式チェック
  try {
    new URL(url)
  } catch {
    res.status(400).json({ error: 'Invalid URL format' })
    return
  }

  try {
    const result = await analyzeLp(url)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('timeout') || message.includes('Timeout')) {
      res.status(504).json({ error: `LP解析がタイムアウトしました: ${message}` })
    } else {
      res.status(500).json({ error: `LP解析に失敗しました: ${message}` })
    }
  }
})

app.listen(PORT, () => {
  console.log(`Playwright LP解析サービス起動: port ${PORT}`)
})
