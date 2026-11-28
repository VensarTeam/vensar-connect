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
  user?: unknown
}

export type AuthenticatedUser = {
  name: string | null
  role: 'admin' | 'developer' | 'management' | null
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

export async function verifyLogin(challengeId: string, code: string): Promise<AuthenticatedUser> {
  if (authPreviewMode && challengeId === previewChallenge.challengeId) {
    if (code !== '123456') throw new Error('That code is incorrect. Please try again.')
    return { name: 'Vishnu', role: 'admin' }
  }
  const data = await post<VerifyLoginResponse>('/auth/verify', { challengeId, code })
  if (data?.authenticated !== true) {
    throw new Error('The code could not be verified. Please try again.')
  }
  const user = data.user && typeof data.user === 'object' ? data.user as { name?: unknown; displayName?: unknown; role?: unknown } : {}
  const rawName = typeof user.displayName === 'string' ? user.displayName : user.name
  const name = typeof rawName === 'string' ? rawName.trim().slice(0, 60) : ''
  return { name: name || null, role: user.role === 'admin' || user.role === 'developer' || user.role === 'management' ? user.role : null }
}

export async function resendLoginCode(challengeId: string): Promise<LoginChallenge> {
  if (authPreviewMode && challengeId === previewChallenge.challengeId) {
    return { ...previewChallenge }
  }
  const data = await post<StartLoginResponse>('/auth/resend', { challengeId })
  return parseChallenge(data)
}

export async function signOut(): Promise<void> {
  if (authPreviewMode) return
  await post<{ signedOut: boolean }>('/auth/logout', {})
}

export async function currentUser(): Promise<AuthenticatedUser | null> {
  if (!apiBase) return null
  let response: Response
  try { response = await fetch(apiBase + '/auth/me', { credentials: 'include' }) }
  catch { return null }
  if (response.status === 401) return null
  if (!response.ok) return null
  const result: unknown = await response.json().catch(() => null)
  if (!result || typeof result !== 'object' || !('authenticated' in result) || result.authenticated !== true) return null
  const user = 'user' in result && result.user && typeof result.user === 'object' ? result.user as { name?: unknown; role?: unknown } : null
  return {
    name: typeof user?.name === 'string' ? user.name.trim().slice(0, 60) || null : null,
    role: user?.role === 'admin' || user?.role === 'developer' || user?.role === 'management' ? user.role : null,
  }
}

export async function heartbeat(): Promise<void> {
  if (authPreviewMode || !apiBase) return
  await post('/auth/heartbeat', {})
}

export async function apiRequest<T>(path: string, body?: object): Promise<T> {
  if (!apiBase) throw new Error('Connect the backend API to use the control panel.')
  let response: Response
  try {
    response = await fetch(apiBase + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch { throw new Error('Could not reach the Vensar Connect API.') }
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'message' in result ? (result as { message?: unknown }).message : null
    throw new Error(typeof message === 'string' ? message : 'Request failed.')
  }
  return result as T
}

export type AvailableProject = {
  project_key: string; project_name: string; project_url: string | null
  category: string | null; description: string | null
  logo_url: string | null; background_image_url: string | null
}

export async function availableProjects(): Promise<AvailableProject[] | null> {
  if (authPreviewMode) return null
  if (!apiBase) throw new Error('The project service is not connected yet.')
  let response: Response
  try { response = await fetch(apiBase + '/projects', { credentials: 'include' }) }
  catch { throw new Error('Could not load your workspaces. Please try again.') }
  if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : 'Could not load your workspaces. Please try again.')
  const result: unknown = await response.json().catch(() => null)
  if (!result || typeof result !== 'object' || !('projects' in result) || !Array.isArray(result.projects)) throw new Error('Invalid project response.')
  return result.projects.filter((item): item is AvailableProject =>
    !!item && typeof item === 'object' && typeof item.project_key === 'string' && typeof item.project_name === 'string' && (typeof item.project_url === 'string' || item.project_url === null))
}
