import { cookies } from "next/headers"
import { config } from "./config"

export interface Session {
  username: string
  authenticated: boolean
  createdAt: number
}

const SESSION_COOKIE_NAME = "music_bot_session"
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Simple in-memory session store (for production, use Redis or database)
const sessions = new Map<string, Session>()

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function createSession(username: string): Promise<string> {
  const sessionId = generateSessionId()
  const session: Session = {
    username,
    authenticated: true,
    createdAt: Date.now(),
  }

  sessions.set(sessionId, session)

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  })

  return sessionId
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionId) {
    return null
  }

  const session = sessions.get(sessionId)

  if (!session) {
    return null
  }

  // Check if session expired
  if (Date.now() - session.createdAt > SESSION_DURATION) {
    sessions.delete(sessionId)
    return null
  }

  return session
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionId) {
    sessions.delete(sessionId)
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function validateCredentials(username: string, password: string): Promise<boolean> {
  return username === config.adminUsername && password === config.adminPassword
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()

  if (!session || !session.authenticated) {
    throw new Error("Unauthorized")
  }

  return session
}
