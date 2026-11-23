import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Network,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  TrainFront,
  Factory,
  Waves,
  Zap,
} from 'lucide-react'
import vensarLogo from './assets/vensar-logo.png'
import { resendLoginCode, startLogin, verifyLogin, type LoginChallenge } from './auth'
import './App.css'

type Step = 'credentials' | 'otp' | 'success'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function countdownLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0')
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
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (step !== 'otp') return
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
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
      await verifyLogin(challenge.challengeId, code)
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

  const entrance = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -12 },
    transition: { duration: reduceMotion ? 0 : 0.35 },
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <section className="brand-panel" aria-label="Vensar Connect">
          <div className="brand-photo" aria-hidden="true" />

          <div className="brand-content">
            <div className="brand-header">
              <span className="brand-logo-frame"><img src={vensarLogo} alt="Vensar" /></span>
              <span className="brand-one">
                <svg className="connection-symbol" viewBox="0 0 42 36" aria-hidden="true" focusable="false">
                  <g className="connection-links">
                    <path d="M4 4 C16 4 20 18 29 18" />
                    <path d="M4 11 C16 11 22 18 29 18" />
                    <path d="M4 18 H29" />
                    <path d="M4 25 C16 25 22 18 29 18" />
                    <path d="M4 32 C16 32 20 18 29 18" />
                  </g>
                  <g className="connection-flows">
                    <path pathLength="100" d="M4 4 C16 4 20 18 29 18" />
                    <path pathLength="100" d="M4 11 C16 11 22 18 29 18" />
                    <path pathLength="100" d="M4 18 H29" />
                    <path pathLength="100" d="M4 25 C16 25 22 18 29 18" />
                    <path pathLength="100" d="M4 32 C16 32 20 18 29 18" />
                  </g>
                  <g className="connection-sources">
                    <circle cx="4" cy="4" r="1.8" />
                    <circle cx="4" cy="11" r="1.8" />
                    <circle cx="4" cy="18" r="1.8" />
                    <circle cx="4" cy="25" r="1.8" />
                    <circle cx="4" cy="32" r="1.8" />
                  </g>
                  <circle className="connection-hub-ring" cx="33" cy="18" r="5" />
                  <circle className="connection-hub" cx="33" cy="18" r="2.1" />
                </svg>
                <span>CONNECT</span>
              </span>
            </div>

            <motion.div
              className="brand-message"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.12 }}
            >
              <p className="brand-eyebrow"><span /> ONE SPACE FOR EVERY TEAM</p>
              <h1>Every project,<br /><em>connected.</em></h1>
              <p className="brand-description">A shared place for the people, projects and decisions that keep Vensar moving.</p>
            </motion.div>

            <div className="project-chain" aria-label="Vensar project areas connecting through Vensar Connect">
              <span className="chain-track" aria-hidden="true"><span className="chain-signal" /></span>
              <div className="chain-item"><span className="chain-node"><Route size={16} strokeWidth={1.7} aria-hidden="true" /></span><span>Roads &<br />Highways</span></div>
              <div className="chain-item"><span className="chain-node"><TrainFront size={16} strokeWidth={1.7} aria-hidden="true" /></span><span>Rail &<br />Metro</span></div>
              <div className="chain-item"><span className="chain-node"><Factory size={16} strokeWidth={1.7} aria-hidden="true" /></span><span>Industrial<br />Buildings</span></div>
              <div className="chain-item"><span className="chain-node"><Waves size={16} strokeWidth={1.7} aria-hidden="true" /></span><span>Irrigation<br />& Water</span></div>
              <div className="chain-item"><span className="chain-node"><Zap size={16} strokeWidth={1.7} aria-hidden="true" /></span><span>Mining &<br />Power</span></div>
              <div className="chain-item chain-item-hub"><span className="chain-node"><Network size={17} strokeWidth={1.8} aria-hidden="true" /></span><span>Vensar<br />Connect</span></div>
            </div>
          </div>
        </section>

        <section className="access-panel" aria-label="Employee sign in">
          <div className="access-content">
            <div className="access-topline">
              <span className="access-badge"><ShieldCheck size={16} strokeWidth={1.8} /> SECURE EMPLOYEE ACCESS</span>
              <span className="step-indicator">{step === 'credentials' ? '01 / 02' : step === 'otp' ? '02 / 02' : '✓'}</span>
            </div>

            <AnimatePresence mode="wait">
              {step === 'credentials' && (
                <motion.div key="credentials" className="step-content" {...entrance}>
                  <div className="access-heading">
                    <span className="heading-kicker">WELCOME TO VENSAR CONNECT</span>
                    <h2>Good to have you back.</h2>
                  </div>

                  <form className="auth-form" onSubmit={handleCredentials} noValidate>
                    <div className="field-group">
                      <label htmlFor="mobile">Mobile number</label>
                      <div className="input-wrap mobile-wrap">
                        <Smartphone size={19} strokeWidth={1.8} aria-hidden="true" />
                        <span className="country-code">+91</span>
                        <input
                          id="mobile"
                          name="mobile"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          value={mobile}
                          onChange={(event) => { setMobile(event.target.value.replace(/\D/g, '').slice(0, 10)); setError('') }}
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor="password">Password</label>
                      <div className="input-wrap">
                        <LockKeyhole size={19} strokeWidth={1.8} aria-hidden="true" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(event) => { setPassword(event.target.value); setError('') }}
                        />
                        <button
                          type="button"
                          className="visibility-button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                      </div>
                    </div>

                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>
                      {busy ? <span className="button-spinner" aria-hidden="true" /> : <span>Continue securely</span>}
                      {!busy && <ArrowRight size={19} aria-hidden="true" />}
                    </button>
                  </form>

                </motion.div>
              )}

              {step === 'otp' && challenge && (
                <motion.div key="otp" className="step-content otp-step" {...entrance}>
                  <button className="back-button" type="button" onClick={returnToCredentials}><ArrowLeft size={16} /> Back to sign in</button>
                  <div className="otp-icon"><Mail size={26} strokeWidth={1.7} /></div>
                  <div className="access-heading otp-heading">
                    <span className="heading-kicker">EMAIL VERIFICATION</span>
                    <h2>Verify your identity.</h2>
                    <p>Enter the 6-digit code for <strong>{challenge.preview ? 'your registered @vensar.com email' : challenge.maskedEmail}</strong>.</p>
                  </div>

                  <form className="auth-form" onSubmit={handleVerify} noValidate>
                    <div className="field-group">
                      <label htmlFor="otp">Verification code</label>
                      <div className="input-wrap otp-wrap">
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="• • • • • •"
                          maxLength={6}
                          value={code}
                          onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                        />
                      </div>
                    </div>
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>
                      {busy ? <span className="button-spinner" aria-hidden="true" /> : <span>Verify & sign in</span>}
                      {!busy && <ArrowRight size={19} aria-hidden="true" />}
                    </button>
                  </form>

                  <div className="resend-row">
                    <span>Didn't receive the code?</span>
                    <button type="button" onClick={handleResend} disabled={busy || resendSeconds > 0}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {resendSeconds > 0 ? 'Resend in ' + countdownLabel(resendSeconds) : 'Resend code'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div key="success" className="step-content success-content" {...entrance}>
                  <div className="success-icon"><Check size={32} strokeWidth={2} /></div>
                  <span className="heading-kicker">VERIFIED ACCESS</span>
                  <h2>Verification complete.</h2>
                  <p>Welcome to Vensar Connect.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <footer className="access-footer">
            <span>© {new Date().getFullYear()} Vensar Constructions Company Limited</span>
            <span className="footer-secure"><LockKeyhole size={12} /> Protected access</span>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default App
