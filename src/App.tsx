import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import { currentUser, heartbeat, resendLoginCode, signOut, startLogin, verifyLogin, type AuthenticatedUser, type LoginChallenge } from './auth'
import { LoginRoutes } from './login/LoginRoutes'
import type { LoginStep } from './login/LoginScreen'
import { backdropSlides } from './login/backdropSlides'
import { ProjectsPage } from './ProjectsPage'
import { ControlPanel } from './ControlPanel'

type Step = LoginStep | 'dashboard' | 'control'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function App() {
  const [step, setStep] = useState<Step>('credentials')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<AuthenticatedUser['role']>(null)
  const [activeBackdrop, setActiveBackdrop] = useState(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true
    void currentUser().then((user) => {
      if (active && user) { setUserName(user.name); setUserRole(user.role); setStep('dashboard') }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (step !== 'dashboard' && step !== 'control') return
    let active = true
    const refreshSession = () => {
      if (document.hidden) return
      void currentUser().then((user) => {
        if (!active) return
        if (!user) {
          setUserName(null); setUserRole(null); setStep('credentials')
        } else if (user.name !== userName || user.role !== userRole) {
          setUserName(user.name); setUserRole(user.role); setStep('dashboard')
        }
      })
    }
    window.addEventListener('focus', refreshSession)
    document.addEventListener('visibilitychange', refreshSession)
    return () => {
      active = false
      window.removeEventListener('focus', refreshSession)
      document.removeEventListener('visibilitychange', refreshSession)
    }
  }, [step, userName, userRole])

  useEffect(() => {
    if (reduceMotion || step === 'dashboard' || step === 'control') return
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveBackdrop((index) => (index + 1) % backdropSlides.length)
    }, 7500)
    return () => window.clearInterval(timer)
  }, [reduceMotion, step])

  useEffect(() => {
    const nextImage = new Image()
    nextImage.src = backdropSlides[(activeBackdrop + 1) % backdropSlides.length].image
  }, [activeBackdrop])

  useEffect(() => {
    if (step !== 'otp') return
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step])

  useEffect(() => {
    if (step !== 'success') return
    const timer = window.setTimeout(() => setStep('dashboard'), reduceMotion ? 0 : 650)
    return () => window.clearTimeout(timer)
  }, [step, reduceMotion])

  useEffect(() => {
    document.title = step === 'control' ? 'Control panel | Vensar Connect' : step === 'dashboard' ? 'Projects & Services | Vensar Connect' : 'Sign in | Vensar Connect'
  }, [step])

  useEffect(() => {
    if (step !== 'dashboard' && step !== 'control') return
    void heartbeat().catch(() => {})
    const timer = window.setInterval(() => {
      if (!document.hidden) void heartbeat().catch(() => {})
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [step])

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }

    setBusy(true)
    try {
      const nextChallenge = await startLogin('+91' + mobile, password)
      setChallenge(nextChallenge)
      setResendSeconds(nextChallenge.resendAfterSeconds)
      setPassword('')
      setCode('')
      setStep('otp')
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!challenge) {
      setError('Your sign-in session has expired. Start again.')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit verification code.')
      return
    }

    setBusy(true)
    try {
      const user = await verifyLogin(challenge.challengeId, code)
      setUserName(user.name)
      setUserRole(user.role)
      setCode('')
      setChallenge(null)
      setStep('success')
    } catch (requestError) {
      setCode('')
      setError(errorText(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!challenge || resendSeconds > 0 || busy) return
    setError('')
    setBusy(true)
    try {
      const nextChallenge = await resendLoginCode(challenge.challengeId)
      setChallenge(nextChallenge)
      setResendSeconds(nextChallenge.resendAfterSeconds)
      setCode('')
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setBusy(false)
    }
  }

  function returnToCredentials() {
    setStep('credentials')
    setChallenge(null)
    setPassword('')
    setCode('')
    setError('')
  }

  async function handleSignOut() {
    await signOut()
    setStep('credentials')
    setMobile('')
    setPassword('')
    setCode('')
    setChallenge(null)
    setResendSeconds(0)
    setShowPassword(false)
    setError('')
    setUserName(null)
    setUserRole(null)
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step === 'dashboard' ? (
        <ProjectsPage key="projects" userName={userName} userRole={userRole} onOpenControlPanel={() => setStep('control')} onSignOut={handleSignOut} reduceMotion={Boolean(reduceMotion)} />
      ) : step === 'control' ? (
        userRole === 'admin' || userRole === 'developer'
          ? <ControlPanel key="control" userName={userName} role={userRole} onBack={() => setStep('dashboard')} onSignOut={handleSignOut} />
          : <ProjectsPage key="projects" userName={userName} userRole={userRole} onOpenControlPanel={() => setStep('control')} onSignOut={handleSignOut} reduceMotion={Boolean(reduceMotion)} />
      ) : (
        <LoginRoutes
          key="sign-in"
          step={step}
          mobile={mobile} setMobile={setMobile}
          password={password} setPassword={setPassword}
          showPassword={showPassword} setShowPassword={setShowPassword}
          code={code} setCode={setCode}
          challenge={challenge} resendSeconds={resendSeconds}
          busy={busy} error={error} setError={setError}
          activeBackdrop={activeBackdrop} setActiveBackdrop={setActiveBackdrop}
          reduceMotion={Boolean(reduceMotion)}
          onCredentials={handleCredentials} onVerify={handleVerify}
          onResend={handleResend} onBack={returnToCredentials}
        />
      )}
    </AnimatePresence>
  )
}

export default App
