import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  Factory,
  HardDrive,
  LogOut,
  Settings2,
  Search,
  Sun,
  TrainFront,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import vensarLogo from './assets/vensar-logo.png'
import vensarMark from './assets/vensar-mark.png'
import irritrackLogo from './assets/irritrack-logo.webp'
import railgridLogo from './assets/railgrid-logo.png'
import powertrackLogo from './assets/powertrack-logo-railgrid-style.png'
import vDriveLogo from './assets/v-drive-logo-railgrid-style.png'
import { ConnectionSymbol } from './ConnectionSymbol'
import { authPreviewMode, availableProjects, type AvailableProject } from './auth'
import './ProjectsPage.css'

const connectionNodes = [
  { x: 110, y: 18, color: '#86a8b9' },
  { x: 184, y: 58, color: '#b9937e' },
  { x: 184, y: 152, color: '#8ea6b8' },
  { x: 110, y: 200, color: '#b9937e' },
  { x: 36, y: 152, color: '#8ea6b8' },
  { x: 36, y: 58, color: '#86a8b9' },
]

type ProjectService = {
  name: string
  key: string
  category: string
  description: string
  keywords?: string
  url?: string
  logoUrl?: string
  backgroundImageUrl?: string
  tone: string
  icon: LucideIcon
}

function projectUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (import.meta.env.DEV && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ? url.href : undefined
  } catch {
    return undefined
  }
}

const services: ProjectService[] = [
  { name: 'IrriTrack', key: 'irritrack', category: 'WATER & IRRIGATION', description: 'Water and irrigation projects.', url: projectUrl(import.meta.env.VITE_IRRITRACK_URL), tone: 'water', icon: Waves },
  { name: 'RailGrid', key: 'railgrid', category: 'RAILWAYS', description: 'Rail and metro workspaces.', keywords: 'Vande Bharat train railway', url: projectUrl(import.meta.env.VITE_RAILGRID_URL), tone: 'rail', icon: TrainFront },
  { name: 'Solar Energy', key: 'solar-energy', category: 'RENEWABLE ENERGY', description: 'Solar energy projects.', url: projectUrl(import.meta.env.VITE_SOLAR_ENERGY_URL), tone: 'solar', icon: Sun },
  { name: 'V Drive', key: 'v-drive', category: 'SHARED WORKSPACE', description: 'A connected place for your work.', url: projectUrl(import.meta.env.VITE_V_DRIVE_URL), tone: 'violet', icon: HardDrive },
  { name: 'PowerTrack', key: 'powertrack', category: 'POWER & ENERGY', description: 'Power and energy projects.', url: projectUrl(import.meta.env.VITE_POWERTRACK_URL), tone: 'power', icon: Zap },
  { name: 'CETP Pali', key: 'cetp-pali', category: 'TREATMENT', description: 'The Pali treatment project.', url: projectUrl(import.meta.env.VITE_CETP_PALI_URL), tone: 'copper', icon: Factory },
]

type ActiveDialog = { type: 'signOut' } | { type: 'project'; service: ProjectService }

function ProjectWordmark({ service }: { service: ProjectService }) {
  if (service.key === 'irritrack') {
    return <span className="projects-wordmark projects-wordmark-irritrack"><img src={irritrackLogo} alt="IrriTrack" /></span>
  }
  if (service.key === 'railgrid') {
    return <span className="projects-wordmark projects-wordmark-railgrid"><img src={railgridLogo} alt="RailGrid" /></span>
  }
  if (service.key === 'powertrack') {
    return <span className="projects-wordmark projects-wordmark-powertrack"><img src={powertrackLogo} alt="PowerTrack" /></span>
  }
  if (service.key === 'v-drive') {
    return <span className="projects-wordmark projects-wordmark-vdrive"><img src={vDriveLogo} alt="V Drive" /></span>
  }
  if (service.logoUrl) return <ExternalProjectWordmark service={service} />
  return <ProjectTextWordmark name={service.name} />
}

function ExternalProjectWordmark({ service }: { service: ProjectService }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <ProjectTextWordmark name={service.name} />
  return <span className="projects-wordmark projects-wordmark-external"><img src={service.logoUrl} alt={service.name} onError={() => setFailed(true)} /></span>
}

function ProjectTextWordmark({ name }: { name: string }) {
  return (
    <span className="projects-wordmark projects-wordmark-text" aria-label={name}>
      <span aria-hidden="true">{name.slice(0, 1)}</span>{name.slice(1).toUpperCase()}
    </span>
  )
}

type ProjectsPageProps = {
  userName: string | null
  userRole: 'admin' | 'developer' | 'management' | null
  onOpenControlPanel: () => void
  onSignOut: () => Promise<void>
  reduceMotion: boolean
}

export function ProjectsPage({ userName, userRole, onOpenControlPanel, onSignOut, reduceMotion }: ProjectsPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [directory, setDirectory] = useState<Map<string, AvailableProject> | null>(authPreviewMode ? null : new Map())
  const [directoryLoading, setDirectoryLoading] = useState(!authPreviewMode)
  const [directoryError, setDirectoryError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const signOutRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const dialogCloseRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const firstName = userName?.split(/\s+/)[0] || null
  const normalizedQuery = query.trim().toLowerCase()
  const visibleServices = directory === null ? services : Array.from(directory.values()).map((project) => {
    const existing = services.find((service) => service.key === project.project_key)
    return {
      ...(existing || {
        key: project.project_key, tone: 'custom', icon: BriefcaseBusiness,
        keywords: '', name: project.project_name, category: 'WORKSPACE', description: 'Project workspace.',
      }),
      name: project.project_name,
      category: project.category?.toUpperCase() || existing?.category || 'WORKSPACE',
      description: project.description || existing?.description || 'Project workspace.',
      url: projectUrl(project.project_url || undefined),
      logoUrl: projectUrl(project.logo_url || undefined),
      backgroundImageUrl: projectUrl(project.background_image_url || undefined),
    }
  })
  const matchingServices = visibleServices
    .map((service, index) => ({ service, index }))
    .filter(({ service }) => !normalizedQuery || [service.name, service.category, service.description, service.keywords ?? '']
      .some((value) => value.toLowerCase().includes(normalizedQuery)))

  useEffect(() => {
    if (authPreviewMode) return
    let active = true
    void availableProjects().then((projects) => {
      if (active) setDirectory(new Map((projects || []).map((project) => [project.project_key, project])))
    }).catch((error: unknown) => {
      if (active) setDirectoryError(error instanceof Error ? error.message : 'Could not load your workspaces.')
    }).finally(() => { if (active) setDirectoryLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    signOutRef.current?.focus()
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!activeDialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => dialogCloseRef.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [activeDialog])

  function closeDialog() {
    setActiveDialog(null)
    setDialogError('')
    requestAnimationFrame(() => returnFocusRef.current?.focus())
  }

  function goLive(service: ProjectService) {
    if (!service.url || dialogBusy) return
    setDialogError('')
    setDialogBusy(true)
    try {
      const destination = new URL('/connect/start', service.url)
      destination.searchParams.set('projectKey', service.key)
      window.location.assign(destination.href)
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Could not open this project.')
      setDialogBusy(false)
    }
  }

  async function confirmSignOut() {
    if (dialogBusy) return
    setDialogError('')
    setDialogBusy(true)
    try { await onSignOut(); setActiveDialog(null) }
    catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Could not sign out.')
      setDialogBusy(false)
    }
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
    }
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <motion.main
      className="projects-page"
      initial={reduceMotion ? false : { opacity: 0, y: 32, scale: .985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: 18, scale: .985 }}
      transition={{ duration: reduceMotion ? 0 : .65, ease: [.22, 1, .36, 1] }}
    >
      <div className="projects-layout" inert={activeDialog !== null}>
        <header className="projects-header">
          <div className="projects-profile" ref={menuRef}>
            <button
              ref={triggerRef}
              className={`projects-profile-trigger${menuOpen ? ' is-open' : ''}`}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="projects-account-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="projects-avatar" aria-hidden="true">{firstName?.charAt(0).toUpperCase() || 'V'}</span>
              <span className="projects-profile-text"><small>YOUR ACCOUNT</small><strong>{firstName ? <><span className="projects-profile-welcome">Welcome, </span>{firstName}</> : 'Welcome'}</strong></span>
              <ChevronDown className="projects-profile-chevron" size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  id="projects-account-menu"
                  className="projects-account-menu"
                  role="menu"
                  initial={reduceMotion ? false : { opacity: 0, y: -8, scale: .97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: .97 }}
                  transition={{ duration: reduceMotion ? 0 : .18 }}
                >
                  <div className="projects-menu-person"><span className="projects-menu-avatar" aria-hidden="true">{firstName?.charAt(0).toUpperCase() || 'V'}</span><span><strong>{userName || 'Vensar team member'}</strong><small>Vensar Connect account</small></span></div>
                  <div className="projects-menu-rule" />
                  {(userRole === 'admin' || userRole === 'developer') && <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenControlPanel() }}><Settings2 size={17} strokeWidth={1.8} aria-hidden="true" />Control panel</button>}
                  <button ref={signOutRef} type="button" role="menuitem" onClick={() => { returnFocusRef.current = triggerRef.current; setMenuOpen(false); setActiveDialog({ type: 'signOut' }) }}><LogOut size={17} strokeWidth={1.8} aria-hidden="true" />Sign out</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <section className="projects-hero" aria-labelledby="projects-heading">
          <div className="projects-hero-photo" aria-hidden="true" />
          <div className="projects-hero-network" aria-hidden="true">
            <svg viewBox="0 0 220 220" focusable="false">
              {connectionNodes.map(({ x, y, color }, index) => {
                const style = { '--node-color': color } as CSSProperties
                const begin = `${index * .9}s`
                return (
                  <g key={`${x}-${y}`} style={style}>
                    <line className="projects-network-link" x1="110" y1="110" x2={x} y2={y} />
                    <circle className="projects-network-halo" cx={x} cy={y} r="7" opacity="0">
                      {!reduceMotion && <>
                        <animate attributeName="r" values="7;7;9;20;20" keyTimes="0;.16;.17;.28;1" dur="6.4s" begin={begin} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0;0;.65;0;0" keyTimes="0;.16;.17;.28;1" dur="6.4s" begin={begin} repeatCount="indefinite" />
                      </>}
                    </circle>
                    <circle className="projects-network-node" cx={x} cy={y} r="7">
                      {!reduceMotion && <animate attributeName="r" values="7;7;10;7;7" keyTimes="0;.16;.19;.26;1" dur="6.4s" begin={begin} repeatCount="indefinite" />}
                    </circle>
                    {!reduceMotion && <circle className="projects-network-signal" cx="0" cy="0" r="4" opacity="0">
                      <animateMotion path={`M 110 110 L ${x} ${y}`} keyPoints="0;0;1;1" keyTimes="0;.03;.16;1" calcMode="linear" dur="6.4s" begin={begin} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;.03;.05;.16;.20;1" dur="6.4s" begin={begin} repeatCount="indefinite" />
                    </circle>}
                  </g>
                )
              })}
            </svg>
            <span className="projects-network-core"><img src={vensarMark} alt="" /></span>
          </div>
          <div className="projects-hero-content">
            <h1 id="projects-heading">Where Vensar’s work<br /><em>comes together.</em></h1>
            <div className="projects-hero-brand" aria-label="Vensar Connect">
              <img src={vensarLogo} alt="Vensar" />
              <span className="projects-brand-product"><ConnectionSymbol /><strong>CONNECT</strong></span>
            </div>
          </div>
        </section>

        <section className="projects-services" aria-labelledby="services-heading">
          <div className="projects-section-heading">
            <div>
              <span className="projects-section-kicker">YOUR WORKSPACES</span>
              <h2 id="services-heading">Projects &amp; services</h2>
            </div>
            <div className="projects-search">
              <Search size={17} strokeWidth={1.9} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                aria-label="Search projects and services"
                placeholder="Search workspaces"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus() }}><X size={15} aria-hidden="true" /></button>}
            </div>
          </div>

          <div className="projects-grid">
            {matchingServices.map(({ service, index }) => {
              const Icon = service.icon
              return (
                <motion.article
                  className={`projects-card projects-card-${service.tone}`}
                  key={service.name}
                  layout={!reduceMotion}
                  initial={reduceMotion || normalizedQuery ? false : { opacity: 0, y: 22, scale: .97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0 : .56, delay: reduceMotion || normalizedQuery ? 0 : .24 + index * .07, ease: [.22, 1, .36, 1] }}
                >
                  <span className="projects-card-media" style={service.backgroundImageUrl ? { backgroundImage: `url("${service.backgroundImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} aria-hidden="true" />
                  <span className="projects-card-icon"><Icon size={24} strokeWidth={1.75} aria-hidden="true" /></span>
                  <div className="projects-card-copy">
                    <span className="projects-card-category">{service.category}</span>
                    <h3><ProjectWordmark service={service} /></h3>
                    <p>{service.description}</p>
                  </div>
                  <span className="projects-card-index">0{index + 1}</span>
                  <span className="projects-card-open" aria-hidden="true">Explore <ArrowUpRight size={14} strokeWidth={1.9} /></span>
                  <button
                    className="projects-card-action"
                    type="button"
                    aria-label={`Explore ${service.name}`}
                    aria-haspopup="dialog"
                    onClick={(event) => { returnFocusRef.current = event.currentTarget; setActiveDialog({ type: 'project', service }) }}
                  />
                </motion.article>
              )
            })}
            {matchingServices.length === 0 && (
              <div className="projects-empty" role="status">
                <span className="projects-empty-icon"><Search size={24} strokeWidth={1.6} aria-hidden="true" /></span>
                <h3>{directoryLoading ? 'Loading workspaces' : directoryError ? 'Workspaces unavailable' : normalizedQuery ? 'No matching workspaces' : 'No workspaces assigned'}</h3>
                <p>{directoryLoading ? 'Finding your projects and services.' : directoryError || (normalizedQuery ? 'Try a different project or service name.' : 'Your projects will appear here when access is granted.')}</p>
                {normalizedQuery && !directoryLoading && !directoryError && <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }}>Clear search</button>}
              </div>
            )}
          </div>
        </section>

        <footer className="projects-footer">
          <span>© {new Date().getFullYear()} Vensar Constructions Company Limited</span>
          <span>Made for the work ahead.</span>
        </footer>
      </div>
      {createPortal(
        <AnimatePresence>
          {activeDialog && (
            <motion.div
              className="projects-dialog-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : .2 }}
              onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}
            >
              <motion.section
                ref={dialogRef}
                className={`projects-dialog${activeDialog.type === 'project' ? ' projects-dialog-project' : ' projects-dialog-signout'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="projects-dialog-title"
                aria-describedby="projects-dialog-description"
                initial={reduceMotion ? false : { opacity: 0, y: 18, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: .97 }}
                transition={{ duration: reduceMotion ? 0 : .28, ease: [.22, 1, .36, 1] }}
                onKeyDown={handleDialogKeyDown}
              >
                {activeDialog.type === 'project' ? (
                  <>
                    <div className={`projects-dialog-visual projects-card-${activeDialog.service.tone}`}>
                      <span className="projects-card-media" style={activeDialog.service.backgroundImageUrl ? { backgroundImage: `url("${activeDialog.service.backgroundImageUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} aria-hidden="true" />
                      <span className="projects-dialog-visual-wash" aria-hidden="true" />
                      <span className="projects-dialog-visual-wordmark"><ProjectWordmark service={activeDialog.service} /></span>
                      <span className="projects-dialog-visual-kicker">PROJECT WORKSPACE</span>
                      <button ref={dialogCloseRef} className="projects-dialog-close" type="button" aria-label="Close project preview" onClick={closeDialog}><X size={18} strokeWidth={1.8} /></button>
                    </div>
                    <div className="projects-dialog-body">
                      <span className="projects-dialog-category">{activeDialog.service.category}</span>
                      <h2 id="projects-dialog-title">Go live with {activeDialog.service.name}?</h2>
                      <p id="projects-dialog-description">{activeDialog.service.description}</p>
                      {!activeDialog.service.url && <p className="projects-dialog-note">This workspace will be available soon.</p>}
                      {dialogError && <p className="projects-dialog-note" role="alert">{dialogError}</p>}
                      <div className="projects-dialog-actions">
                        <button className="projects-dialog-secondary" type="button" onClick={closeDialog}>Not now</button>
                        {activeDialog.service.url ? (
                          <button className="projects-dialog-primary" type="button" disabled={dialogBusy} onClick={() => goLive(activeDialog.service)}>{dialogBusy ? 'Opening…' : 'Go live'} <ArrowUpRight size={17} strokeWidth={1.9} /></button>
                        ) : (
                          <button className="projects-dialog-primary" type="button" disabled>Go live <ArrowUpRight size={17} strokeWidth={1.9} /></button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="projects-dialog-body">
                    <button ref={dialogCloseRef} className="projects-dialog-close" type="button" aria-label="Close sign out confirmation" onClick={closeDialog}><X size={18} strokeWidth={1.8} /></button>
                    <span className="projects-dialog-signout-icon"><LogOut size={23} strokeWidth={1.75} aria-hidden="true" /></span>
                    <span className="projects-dialog-category">VENSAR CONNECT</span>
                    <h2 id="projects-dialog-title">Sign out?</h2>
                    <p id="projects-dialog-description">You’ll return to the Vensar Connect sign in page.</p>
                    {dialogError && <p className="projects-dialog-note" role="alert">{dialogError}</p>}
                    <div className="projects-dialog-actions">
                      <button className="projects-dialog-secondary" type="button" onClick={closeDialog}>Stay signed in</button>
                      <button className="projects-dialog-primary" type="button" disabled={dialogBusy} onClick={() => { void confirmSignOut() }}>{dialogBusy ? 'Signing out…' : 'Sign out'} <ArrowUpRight size={17} strokeWidth={1.9} /></button>
                    </div>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.main>
  )
}
