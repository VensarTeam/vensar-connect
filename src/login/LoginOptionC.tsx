import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Network, Route, ShieldCheck, Smartphone, TrainFront, Factory, Waves, Zap } from 'lucide-react'
import vensarLogo from '../assets/vensar-logo.png'
import vensarOffice from '../assets/vensar-office.webp'
import { ConnectionSymbol } from '../ConnectionSymbol'
import { backdropSlides } from './backdropSlides'
import type { LoginScreenProps } from './LoginScreen'
import './LoginOptionC.css'

function countdownLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0')
}

export function LoginOptionC({
  step, mobile, setMobile, password, setPassword, showPassword, setShowPassword,
  code, setCode, challenge, resendSeconds, busy, error, setError,
  activeBackdrop, setActiveBackdrop, reduceMotion,
  onCredentials: handleCredentials, onVerify: handleVerify,
  onResend: handleResend, onBack: returnToCredentials,
}: LoginScreenProps) {
  const entrance = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -12 },
    transition: { duration: reduceMotion ? 0 : 0.35 },
  }
  const previewSlide = backdropSlides[activeBackdrop % backdropSlides.length]

  return (
    <motion.main
      key="sign-in"
      className="login-page login-page--option-c"
      exit={reduceMotion ? undefined : { opacity: 0, y: -20, scale: .97, filter: 'blur(8px)' }}
      transition={{ duration: reduceMotion ? 0 : .45, ease: [.4, 0, .2, 1] }}
    >
      <header className="login-standalone-logo"><span className="login-logo-frame"><img src={vensarLogo} alt="Vensar" /></span></header>
      <div className="option-c-layout">
      <div className="login-shell">
        <section className="brand-panel" aria-label="Vensar Connect">
          <div className="login-backdrop" aria-hidden="true">
            <div className="login-backdrop-slide" style={{ backgroundImage: `url(${vensarOffice})` }} />
            <span className="login-backdrop-wash" />
          </div>
          <div className="brand-content">
            <div className="option-c-brand-top">
              <span className="option-c-connect-wordmark">
                <ConnectionSymbol />
                <span>CONNECT</span>
              </span>
            </div>

            <motion.div
              className="brand-message"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.12 }}
            >
              <p className="brand-eyebrow"><span /> ONE SPACE FOR MANAGEMENT</p>
              <h1>Where Vensar’s work<br /><em>comes together.</em></h1>
              <p className="brand-description">A clear path to the people, projects and decisions moving Vensar forward.</p>
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

        <section className={`access-panel${step === 'otp' ? ' access-panel-otp' : ''}`} aria-label="Employee sign in">
          <div className="access-content">
            <div className="access-topline">
              <span className="access-badge"><ShieldCheck size={16} strokeWidth={1.8} /> SECURE MANAGEMENT ACCESS</span>
              <span className="step-indicator">{step === 'credentials' ? '01 / 02' : step === 'otp' ? '02 / 02' : '✓'}</span>
            </div>

            <AnimatePresence mode="wait">
              {step === 'credentials' && (
                <motion.div key="credentials" className="step-content credentials-step" {...entrance}>
                  <div className="access-heading">
                    <h2>Welcome back.</h2>
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
                  <button className="back-button" type="button" onClick={returnToCredentials} aria-label="Back to sign in"><ArrowLeft size={16} /> Back</button>
                  <div className="access-heading otp-heading">
                    <h2>Enter your code.</h2>
                    <p id="otp-instructions">Enter the 6-digit code for <strong>{challenge.preview ? 'your Vensar email' : challenge.maskedEmail}</strong>.</p>
                  </div>

                  <form className="auth-form" onSubmit={handleVerify} noValidate>
                    <div className="field-group">
                      <label className="otp-visually-hidden" htmlFor="otp">Verification code</label>
                      <div className="otp-wrap">
                        <div className="otp-slots" aria-hidden="true">
                          {Array.from({ length: 6 }, (_, index) => (
                            <span key={index} className={`otp-slot ${code[index] ? 'otp-slot-filled' : 'otp-slot-empty'}${index === code.length && code.length < 6 ? ' otp-slot-active' : ''}`}>
                              {code[index] || ''}
                            </span>
                          ))}
                        </div>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          autoFocus
                          aria-describedby="otp-instructions"
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
                    <button type="button" onClick={handleResend} disabled={busy || resendSeconds > 0}>
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
            <span className="footer-secure"><LockKeyhole size={12} /> Secure &amp; encrypted</span>
          </footer>
        </section>
      </div>
      <aside className="option-c-preview" aria-label="Vensar project photo preview">
        <div className="option-c-preview-main">
          <AnimatePresence initial={false}>
            <motion.img
              key={previewSlide.image}
              src={previewSlide.image}
              alt={previewSlide.label}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.75, ease: 'easeInOut' }}
            />
          </AnimatePresence>
          <div className="option-c-preview-actions">
            <button type="button" aria-label="Previous photo" onClick={() => setActiveBackdrop((index) => (index - 1 + backdropSlides.length) % backdropSlides.length)}><ArrowLeft size={17} /></button>
            <button type="button" aria-label="Next photo" onClick={() => setActiveBackdrop((index) => (index + 1) % backdropSlides.length)}><ArrowRight size={17} /></button>
          </div>
        </div>
      </aside>
      </div>
    </motion.main>
  )
}
