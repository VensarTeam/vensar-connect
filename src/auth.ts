export type LoginChallenge = {
  challengeId: string
  maskedEmail: string
  resendAfterSeconds: number
  preview?: boolean
}

type StartLoginResponse = {
  challengeId?: unknown
  maskedEmail?: unknown
  resendAfterSeconds?: unknown
}

type VerifyLoginResponse = {
  authenticated?: unknown
}

const apiBase = import.meta.env.VITE_AUTH_API_URL?.replace(/\/+$/, '')
export const authPreviewMode = import.meta.env.DEV && !apiBase

const previewChallenge: LoginChallenge = {
  challengeId: 'local-preview-only',
  maskedEmail: 'p***@vensar.com',
  resendAfterSeconds: 15,
  preview: true,
}

async function post<T>(path: string, body: object): Promise<T> {
  if (!apiBase) {
    throw new Error('The sign-in service is not connected yet.')
  }

  let response: Response
  try {
    response = await fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the sign-in service. Please try again.')
  }

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'message' in data
      ? (data as { message?: unknown }).message
      : undefined
    throw new Error(typeof message === 'string' ? message : 'Sign-in could not be completed. Please try again.')
  }

  return data as T
}

function parseChallenge(data: unknown): LoginChallenge {
  const challenge = data && typeof data === 'object' ? data as StartLoginResponse : {}
  if (
    typeof challenge.challengeId !== 'string' ||
    !challenge.challengeId ||
    typeof challenge.maskedEmail !== 'string' ||
    !challenge.maskedEmail.toLowerCase().endsWith('@vensar.com')
  ) {
    throw new Error('The sign-in service returned an invalid company email challenge.')
  }

  return {
    challengeId: challenge.challengeId,
    maskedEmail: challenge.maskedEmail,
    resendAfterSeconds: typeof challenge.resendAfterSeconds === 'number' && Number.isFinite(challenge.resendAfterSeconds)
      ? Math.max(0, Math.floor(challenge.resendAfterSeconds))
      : 30,
  }
}

export async function startLogin(mobile: string, password: string): Promise<LoginChallenge> {
  if (authPreviewMode) {
    void mobile
    void password
    return { ...previewChallenge }
  }
  const data = await post<StartLoginResponse>('/auth/start', { mobile, password })
  return parseChallenge(data)
}

export async function verifyLogin(challengeId: string, code: string): Promise<void> {
  if (authPreviewMode && challengeId === previewChallenge.challengeId) {
    if (code !== '123456') throw new Error('That code is incorrect. Please try again.')
    return
  }
  const data = await post<VerifyLoginResponse>('/auth/verify', { challengeId, code })
  if (data?.authenticated !== true) {
    throw new Error('The code could not be verified. Please try again.')
  }
}

export async function resendLoginCode(challengeId: string): Promise<LoginChallenge> {
  if (authPreviewMode && challengeId === previewChallenge.challengeId) {
    return { ...previewChallenge }
  }
  const data = await post<StartLoginResponse>('/auth/resend', { challengeId })
  return parseChallenge(data)
}
