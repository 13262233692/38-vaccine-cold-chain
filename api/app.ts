import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import iotRoutes from './routes/iot.js'
import sseRoutes from './routes/sse.js'
import alertRoutes from './routes/alerts.js'
import auditRoutes from './routes/audit.js'
import { initStore } from './repository/dataStore.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

initStore()

app.use('/api/iot', iotRoutes)
app.use('/api/sse', sseRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/audit', auditRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
