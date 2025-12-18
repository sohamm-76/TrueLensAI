import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import admin from 'firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import { readFileSync } from 'fs'

dotenv.config()

type AuthedRequest = Request & { userId?: string }

function loadServiceAccount(path: string): admin.ServiceAccount | undefined {
  try {
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as admin.ServiceAccount
  } catch {
    // If the existing build expected passing a path string directly, we fall back below.
    return undefined
  }
}

const app = express()

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: [
      'chrome-extension://*',
      'http://localhost:*',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ],
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-key.json'
const serviceAccount = loadServiceAccount(serviceAccountPath)

admin.initializeApp({
  // Prefer loading the JSON ourselves (most reliable across firebase-admin versions)
  credential: serviceAccount
    ? admin.credential.cert(serviceAccount)
    : // fallback to the behavior of the existing dist build
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      admin.credential.cert(serviceAccountPath as any),
  projectId: process.env.FIREBASE_PROJECT_ID,
})

const db = admin.firestore()
const auth = admin.auth()

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// Middleware to verify Firebase Auth token
const verifyAuthToken = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' })
  }

  try {
    const decodedToken = await auth.verifyIdToken(token)
    req.userId = decodedToken.uid
    next()
  } catch {
    res.status(401).json({ error: 'Invalid authorization token' })
  }
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// ==================== ANALYZE ARTICLE ====================
app.post('/api/analyze', verifyAuthToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { text, userId } = req.body as { text?: string; userId?: string; url?: string }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Article text is required' })
    }

    // Use Gemini to analyze article
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    // Extract claims
    const claimsPrompt = `Analyze the following article and extract 3-5 key factual claims that can be fact-checked. Format as JSON array.

Article:
${text.substring(0, 2000)}

Respond with JSON array only, like: ["claim1", "claim2", "claim3"]`

    const claimsResult = await model.generateContent(claimsPrompt)
    const claimsText = claimsResult.response.text()

    let claims: string[] = []
    try {
      claims = JSON.parse(claimsText) as string[]
    } catch {
      claims = [claimsText]
    }

    // Generate summary
    const summaryPrompt = `Summarize the following article in exactly 3 bullet points. Each point should be concise and factual.

Article:
${text.substring(0, 2000)}

Format as JSON array, like: ["point1", "point2", "point3"]`

    const summaryResult = await model.generateContent(summaryPrompt)
    const summaryText = summaryResult.response.text()

    let summary: string[] = []
    try {
      summary = JSON.parse(summaryText) as string[]
    } catch {
      summary = [summaryText]
    }

    // Fact-check claims using search
    let reliabilityScore = 70 // Default score

    if (process.env.SERPER_API_KEY) {
      const verifiedClaims: number[] = await Promise.all(
        claims.slice(0, 3).map(async (claim) => {
          try {
            const response = await axios.post(
              'https://google.serper.dev/search',
              { q: claim, num: 5 },
              {
                headers: {
                  'X-API-KEY': process.env.SERPER_API_KEY,
                  'Content-Type': 'application/json',
                },
              }
            )
            const results = (response.data as { organic?: unknown[] })?.organic || []
            return results.length > 0 ? 1 : 0
          } catch {
            return 0
          }
        })
      )

      const verificationRate = verifiedClaims.reduce((a, b) => a + b, 0) / verifiedClaims.length
      reliabilityScore = Math.round(70 + verificationRate * 30) // 70-100
    }

    // Save analysis to Firestore
    const analysisRef = await db.collection('analysis').add({
      userId,
      text: text.substring(0, 500),
      claims,
      summary,
      reliabilityScore,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      url: (req.body as { url?: string }).url || null,
    })

    // Update user's reputation score
    const userRef = db.collection('users').doc(userId || '')
    await userRef.update({
      [`history.${analysisRef.id}`]: {
        score: reliabilityScore,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
    })

    res.json({
      reliabilityScore,
      summary,
      claims,
      sourceAnalysis: [],
      success: true,
    })
  } catch (error) {
    console.error('Analysis error:', error)
    res.status(500).json({ error: 'Failed to analyze article' })
  }
})

// ==================== CHAT ENDPOINT ====================
app.post('/api/chat', verifyAuthToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { message, userId, articleContext } = req.body as {
      message?: string
      userId?: string
      articleContext?: string
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

    const systemPrompt = `You are TrueLensGPT, an intelligent news verification assistant. You help users analyze articles, fact-check claims, and understand news credibility. 
    
${articleContext ? `The user is currently reading this article:\n${articleContext}\n\n` : ''}

Provide helpful, accurate, and balanced responses. Be concise but thorough.`

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nUser message: ${message}` }],
        },
      ],
    })

    const response = result.response.text()

    // Save chat message to Firestore
    await db.collection('chats').add({
      userId,
      userMessage: message,
      assistantResponse: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      articleContext: articleContext || null,
    })

    res.json({ response, success: true })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Failed to process chat message' })
  }
})

// ==================== REPORT INACCURACY ====================
app.post('/api/report-inaccuracy', verifyAuthToken, async (req: AuthedRequest, res: Response) => {
  try {
    const { text, report, userId, reliabilityScore } = req.body as {
      text?: string
      report?: string
      userId?: string
      reliabilityScore?: number
    }

    if (!report || report.trim().length === 0) {
      return res.status(400).json({ error: 'Report text is required' })
    }

    await db.collection('inaccuracyReports').add({
      userId,
      articleText: (text || '').substring(0, 500),
      report,
      reliabilityScore,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
    })

    res.json({ success: true, message: 'Report submitted successfully' })
  } catch (error) {
    console.error('Report error:', error)
    res.status(500).json({ error: 'Failed to submit report' })
  }
})

// ==================== USER HISTORY ====================
app.get('/api/user/history', verifyAuthToken, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId

    const snapshot = await db
      .collection('analysis')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get()

    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      timestamp: (doc.data() as any).timestamp?.toDate?.(),
    }))

    res.json({ history, success: true })
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ==================== USER PROFILE ====================
app.get('/api/user/profile', verifyAuthToken, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const doc = await db.collection('users').doc(userId).get()

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ profile: doc.data(), success: true })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// ==================== ERROR HANDLING ====================
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// ==================== SERVER START ====================
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`TrueLensAI Backend running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app


