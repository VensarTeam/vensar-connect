import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, ArrowLeft, BriefcaseBusiness, Check, ChevronDown, Clock3, Factory,
  Globe2, HardDrive, KeyRound, LayoutDashboard, LogOut, Plus, Search,
  ShieldCheck, SlidersHorizontal, Sun, TrainFront, Users, Waves, X, Zap,
} from 'lucide-react'
import { apiRequest, authPreviewMode } from './auth'
import vensarLogo from './assets/vensar-logo.png'
import { ConnectionSymbol } from './ConnectionSymbol'
import './ControlPanel.css'

type Role = 'admin' | 'developer' | 'management'
type Tab = 'overview' | 'people' | 'projects' | 'access' | 'activity'
type Person = {
  id: string; name: string; email: string; contact: string; role: Role; is_active: boolean
  department: string | null; designation: string | null; project_count: number; created_at: string
}
type Project = {
  id: string; project_key: string; project_name: string; category: string | null
  description: string | null; project_url: string | null; background_image_url: string | null
  logo_url: string | null; is_active: boolean; member_count: number
}
type Grant = { id: string; user_id: string; project_id: string; is_active: boolean }
type Event = {
  id: number; event_type: string; occurred_at: string; user_agent: string | null
  user_id: string | null; user_name: string | null; project_id: string | null; project_name: string | null
}
type Session = {
  id: string; user_id: string; user_name: string; created_at: string; last_seen_at: string
  revoked_at: string | null; expires_at: string; user_agent: string | null; duration_seconds: number
}
type ActivityBucket = {
  label: string; range: string; connect: number; projects: number
}
type ProjectDraft = {
  id?: string; projectKey: string; projectName: string; category: string; description: string
  projectUrl: string; backgroundImageUrl: string; logoUrl: string; isActive: boolean
}

const blankProject: ProjectDraft = {
  projectKey: '', projectName: '', category: '', description: '', projectUrl: '',
  backgroundImageUrl: '', logoUrl: '', isActive: true,
}
const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'people', label: 'Users', icon: Users },
  { id: 'projects', label: 'Projects', icon: BriefcaseBusiness },
  { id: 'access', label: 'Access', icon: KeyRound },
  { id: 'activity', label: 'Activity', icon: Activity },
]
const projectIcons: Record<string, typeof Waves> = {
  irritrack: Waves, railgrid: TrainFront, 'solar-energy': Sun,
  'v-drive': HardDrive, powertrack: Zap, 'cetp-pali': Factory,
}
const projectTones: Record<string, string> = {
  irritrack: 'water', railgrid: 'rail', 'solar-energy': 'solar',
  'v-drive': 'violet', powertrack: 'power', 'cetp-pali': 'copper',
}
const eventLabels: Record<string, string> = {
  login_succeeded: 'Signed in', login_failed: 'Sign in failed', login_challenge_sent: 'Code sent',
  login_code_resent: 'Code resent', login_code_failed: 'Code rejected', logout: 'Signed out',
  project_handoff_created: 'Opened project', project_handoff_redeemed: 'Signed in to project',
  user_created: 'Created user', user_updated: 'Updated user', project_created: 'Created project',
  project_updated: 'Updated project', access_updated: 'Changed access',
}

function browserName(agent: string | null): string {
  if (!agent) return 'Unknown browser'
  if (/Edg\//.test(agent)) return 'Microsoft Edge'
  if (/Firefox\//.test(agent)) return 'Firefox'
  if (/Chrome\//.test(agent)) return 'Chrome'
  if (/Safari\//.test(agent)) return 'Safari'
  return 'Other browser'
}

function duration(seconds: number): string {
  if (seconds < 60) return '<1 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`
}

function time(value: string): string {
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function memberCount(count: number): string { return `${count} ${count === 1 ? 'member' : 'members'}` }

function activityBuckets(days: 7 | 30 | 90, sessions: Session[], events: Event[]): ActivityBucket[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const span = days === 90 ? 7 : 1
  const start = now - days * dayMs
  const dayLabel = (value: number) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const buckets = Array.from({ length: Math.ceil(days / span) }, (_, index) => {
    const from = start + index * span * dayMs
    const to = Math.min(now, from + span * dayMs)
    const showLabel = days === 7 || (days === 30 ? index % 5 === 0 : index % 3 === 0) || index === Math.ceil(days / span) - 1
    return { label: showLabel ? dayLabel(to) : '', range: `${dayLabel(from)}–${dayLabel(to)}`, connect: 0, projects: 0 }
  })
  const bucketFor = (timestamp: string) => {
    const value = new Date(timestamp).getTime()
    if (!Number.isFinite(value) || value < start || value > now) return null
    const index = Math.min(buckets.length - 1, Math.floor((value - start) / (span * dayMs)))
    return buckets[index]
  }
  for (const session of sessions) {
    const bucket = bucketFor(session.created_at)
    if (bucket) bucket.connect += 1
  }
  for (const event of events) {
    if (event.event_type !== 'project_handoff_redeemed') continue
    const bucket = bucketFor(event.occurred_at)
    if (bucket) bucket.projects += 1
  }
  return buckets
}

function projectDraft(project: Project): ProjectDraft {
  return {
    id: project.id, projectKey: project.project_key, projectName: project.project_name,
    category: project.category || '', description: project.description || '',
    projectUrl: project.project_url || '', backgroundImageUrl: project.background_image_url || '',
    logoUrl: project.logo_url || '', isActive: project.is_active,
  }
}

export function ControlPanel({ userName, role, onBack, onSignOut }: {
  userName: string | null; role: 'admin' | 'developer'; onBack: () => void; onSignOut: () => Promise<void>
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [people, setPeople] = useState<Person[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [metrics, setMetrics] = useState({ connect_sign_ins: 0, project_sign_ins: 0, duration_seconds: 0 })
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [personFilter, setPersonFilter] = useState('')
  const [personRole, setPersonRole] = useState<Role | 'all'>('all')
  const [personStatus, setPersonStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [projectStatus, setProjectStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [accessFilter, setAccessFilter] = useState('')
  const [accessProject, setAccessProject] = useState('')
  const [activityUser, setActivityUser] = useState('')
  const [activityProject, setActivityProject] = useState('')
  const [shownSessions, setShownSessions] = useState(6)
  const [shownEvents, setShownEvents] = useState(6)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [personModal, setPersonModal] = useState(false)
  const [projectModal, setProjectModal] = useState(false)
  const [signOutModal, setSignOutModal] = useState(false)
  const [newPerson, setNewPerson] = useState({
    name: '', email: '', mobile: '', password: '', role: 'management' as Role,
    department: '', designation: '',
  })
  const [draft, setDraft] = useState<ProjectDraft>(blankProject)

  const loadDirectory = useCallback(async () => {
    if (authPreviewMode) { setLoading(false); setError('Connect the backend API to manage real users, projects and activity.'); return }
    try {
      const [users, projectList, accessList] = await Promise.all([
        apiRequest<{ users: Person[] }>('/admin/users'),
        apiRequest<{ projects: Project[] }>('/admin/projects'),
        apiRequest<{ access: Grant[] }>('/admin/access'),
      ])
      setPeople(users.users); setProjects(projectList.projects); setGrants(accessList.access)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the control panel.') }
    finally { setLoading(false) }
  }, [])

  const loadActivity = useCallback(async () => {
    if (authPreviewMode) return
    try {
      const params = new URLSearchParams({ days: String(days) })
      if (activityUser) params.set('userId', activityUser)
      if (activityProject) params.set('projectId', activityProject)
      const result = await apiRequest<{ events: Event[]; sessions: Session[]; metrics: typeof metrics }>(`/admin/activity?${params}`)
      setEvents(result.events); setSessions(result.sessions); setMetrics(result.metrics)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load activity.') }
  }, [days, activityUser, activityProject])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDirectory() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDirectory])
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadActivity() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadActivity])

  const activePeople = people.filter((person) => person.is_active).length
  const activeProjects = projects.filter((project) => project.is_active).length
  const loginCount = metrics.connect_sign_ins
  const projectLogins = metrics.project_sign_ins
  const totalDuration = metrics.duration_seconds
  const browserCounts = Object.entries(sessions.reduce<Record<string, number>>((counts, session) => {
    const name = browserName(session.user_agent)
    counts[name] = (counts[name] || 0) + 1
    return counts
  }, {})).sort((a, b) => b[1] - a[1])
  const browserPalette = ['#315e78', '#d2a456', '#7fa6b4', '#88a18b', '#b8c8d0']
  const browserGradient = browserCounts.length ? `conic-gradient(${browserCounts.map(([, count], index) => {
    const before = browserCounts.slice(0, index).reduce((sum, [, value]) => sum + value, 0) / sessions.length * 100
    return `${browserPalette[index % browserPalette.length]} ${before}% ${before + count / sessions.length * 100}%`
  }).join(', ')})` : undefined
  const trend = useMemo(() => activityBuckets(days, sessions, events), [days, sessions, events])
  const filteredPeople = useMemo(() => people.filter((person) =>
    (!personFilter || [person.name, person.email, person.department || '', person.role]
      .some((value) => value.toLowerCase().includes(personFilter.toLowerCase()))) &&
    (personRole === 'all' || person.role === personRole) &&
    (personStatus === 'all' || person.is_active === (personStatus === 'active')),
  ), [people, personFilter, personRole, personStatus])
  const filteredProjects = useMemo(() => projects.filter((project) =>
    (!projectFilter || [project.project_name, project.category || '', project.project_key]
      .some((value) => value.toLowerCase().includes(projectFilter.toLowerCase()))) &&
    (projectStatus === 'all' || project.is_active === (projectStatus === 'active')),
  ), [projects, projectFilter, projectStatus])
  const accessPeople = useMemo(() => people.filter((person) =>
    !accessFilter || [person.name, person.email, person.department || '']
      .some((value) => value.toLowerCase().includes(accessFilter.toLowerCase())),
  ), [people, accessFilter])
  const accessProjects = accessProject ? projects.filter((project) => project.id === accessProject) : projects
  const grantSet = useMemo(() => new Set(grants.filter((grant) => grant.is_active)
    .map((grant) => `${grant.user_id}:${grant.project_id}`)), [grants])

  async function mutation(path: string, body: object, success: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await apiRequest(path, body)
      await loadDirectory()
      await loadActivity()
      setNotice(success)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save changes.')
      return false
    } finally { setBusy(false) }
  }

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await mutation('/admin/users', {
      name: newPerson.name, email: newPerson.email,
      contact: '+91' + newPerson.mobile.replace(/\D/g, ''),
      password: newPerson.password, role: newPerson.role,
      department: newPerson.department, designation: newPerson.designation,
    }, 'User created. Assign their project access next.')
    if (done) {
      setPersonModal(false)
      setNewPerson({ name: '', email: '', mobile: '', password: '', role: 'management', department: '', designation: '' })
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const done = await mutation(draft.id ? '/admin/projects/update' : '/admin/projects',
      draft, draft.id ? 'Project updated.' : 'Project created. Assign access next.')
    if (done) setProjectModal(false)
  }

  async function setGrant(userId: string, projectId: string, isActive: boolean) {
    await mutation('/admin/access', { userId, projectId, isActive }, isActive ? 'Access granted.' : 'Access removed.')
  }

  async function setPersonState(person: Person, roleValue: Role, isActive: boolean) {
    await mutation('/admin/users/update', { id: person.id, role: roleValue, isActive },
      isActive ? 'User updated.' : 'User deactivated and signed out.')
  }

  function closePersonModal() {
    setPersonModal(false)
    setNewPerson({ name: '', email: '', mobile: '', password: '', role: 'management', department: '', designation: '' })
  }

  return (
    <main className="control-page">
      <div className="control-shell">
        <aside className="control-sidebar" aria-label="Control panel navigation">
          <div className="control-brand"><img src={vensarLogo} alt="Vensar" /><span><ConnectionSymbol />CONNECT</span></div>
          <nav className="control-nav" aria-label="Sections">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />{label}
              </button>
            ))}
          </nav>
          <div className="control-side-bottom">
            <div className="control-identity"><span>{userName?.charAt(0).toUpperCase() || 'V'}</span><div><strong>{userName || 'Vensar member'}</strong><small>{role}</small></div></div>
            <button type="button" onClick={onBack}><ArrowLeft size={17} />Workspaces</button>
            <button type="button" onClick={() => setSignOutModal(true)}><LogOut size={17} />Sign out</button>
          </div>
        </aside>

        <div className="control-main">
          <header className="control-topbar">
            <button className="control-back-mobile" type="button" onClick={onBack} aria-label="Back to workspaces"><ArrowLeft size={20} /></button>
            <div className="control-heading"><span className="control-eyebrow">CONTROL PANEL</span><h1>{tabs.find((item) => item.id === tab)?.label}</h1></div>
            <div className="control-top-actions">
              {(tab === 'overview' || tab === 'activity') && <label className="control-select control-period"><Clock3 size={16} aria-hidden="true" /><span className="sr-only">Period</span><select value={days} onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select><ChevronDown size={15} aria-hidden="true" /></label>}
              <span className="control-role"><ShieldCheck size={16} />{role === 'admin' ? 'Admin' : 'Developer'}</span>
              <button className="control-signout-mobile" type="button" onClick={() => setSignOutModal(true)} aria-label="Sign out"><LogOut size={18} /></button>
            </div>
          </header>

          {notice && <div className="control-notice" role="status"><Check size={18} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}
          {error && <div className="control-error" role="alert">{error}</div>}
          {loading ? <div className="control-loading">Loading your control panel…</div> : (
            <>
              {tab === 'overview' && (
                <div className="control-content">
                  <div className="control-stat-grid">
                    <Stat label="Active users" value={activePeople} icon={Users} detail={`${people.length} total`} />
                    <Stat label="Projects" value={activeProjects} icon={BriefcaseBusiness} detail={`${projects.length} total`} />
                    <Stat label="Sign ins" value={loginCount} icon={KeyRound} detail={`${days} days`} />
                    <Stat label="Project visits" value={projectLogins} icon={Activity} detail={`${days} days`} />
                  </div>
                  <div className="control-two-col">
                    <section className="control-panel"><div className="control-panel-head"><h2>Recent activity</h2><button type="button" onClick={() => setTab('activity')}>View all</button></div><ActivityList events={events.slice(0, 6)} /></section>
                    <section className="control-panel"><div className="control-panel-head"><h2>Projects</h2><button type="button" onClick={() => setTab('projects')}>Manage</button></div><div className="control-project-summary">{projects.slice(0, 6).map((project) => { const Icon = projectIcons[project.project_key] || BriefcaseBusiness; return <div key={project.id}><span className="control-project-monogram"><Icon size={18} strokeWidth={1.8} /></span><strong>{project.project_name}</strong><small>{memberCount(project.member_count)}</small></div> })}{projects.length === 0 && <Empty text="No projects yet." />}</div></section>
                  </div>
                </div>
              )}

              {tab === 'people' && (
                <div className="control-content">
                  <div className="control-toolbar"><label className="control-search"><Search size={17} /><input value={personFilter} onChange={(event) => setPersonFilter(event.target.value)} placeholder="Search users" aria-label="Search users" /></label><label className="control-select"><span className="sr-only">Role</span><select value={personRole} onChange={(event) => setPersonRole(event.target.value as Role | 'all')}><option value="all">All roles</option><option value="admin">Admin</option><option value="developer">Developer</option><option value="management">Management</option></select><ChevronDown size={15} /></label><label className="control-select"><span className="sr-only">Status</span><select value={personStatus} onChange={(event) => setPersonStatus(event.target.value as typeof personStatus)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><ChevronDown size={15} /></label><span className="control-result-count">{filteredPeople.length} {filteredPeople.length === 1 ? 'user' : 'users'}</span>{role === 'admin' && <button className="control-primary" type="button" onClick={() => setPersonModal(true)}><Plus size={17} />New user</button>}</div>
                  <div className="control-panel control-table-wrap">
                    <table className="control-table">
                      <thead><tr><th>User</th><th>Department</th><th>Role</th><th>Projects</th><th>Status</th>{role === 'admin' && <th>Manage</th>}</tr></thead>
                      <tbody>{filteredPeople.map((person) => <tr key={person.id}>
                        <td><div className="control-person-cell"><span>{person.name.charAt(0)}</span><div><strong>{person.name}</strong><small>{person.email} · {person.contact}</small></div></div></td>
                        <td data-label="Department"><span>{person.department || '—'}<small className="control-cell-sub">{person.designation || ''}</small></span></td>
                        <td data-label="Role">{role === 'admin' ? <label className="control-select"><span className="sr-only">Role for {person.name}</span><select value={person.role} disabled={busy} onChange={(event) => { void setPersonState(person, event.target.value as Role, person.is_active) }}><option value="management">Management</option><option value="developer">Developer</option><option value="admin">Admin</option></select><ChevronDown size={14} /></label> : <span className={`control-badge control-badge-${person.role}`}>{person.role}</span>}</td>
                        <td data-label="Projects">{person.project_count}</td>
                        <td data-label="Status"><span className={`control-status ${person.is_active ? 'is-on' : ''}`}>{person.is_active ? 'Active' : 'Inactive'}</span></td>
                        {role === 'admin' && <td data-label="Manage"><div className="control-row-actions"><button type="button" disabled={busy} onClick={() => { void setPersonState(person, person.role, !person.is_active) }}>{person.is_active ? 'Deactivate' : 'Activate'}</button></div></td>}
                      </tr>)}</tbody>
                    </table>
                    {filteredPeople.length === 0 && <Empty text="No users found." />}
                  </div>
                </div>
              )}

              {tab === 'projects' && (
                <div className="control-content">
                  <div className="control-toolbar"><label className="control-search"><Search size={17} /><input value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} placeholder="Search projects" aria-label="Search projects" /></label><label className="control-select"><span className="sr-only">Status</span><select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value as typeof projectStatus)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><ChevronDown size={15} /></label><span className="control-result-count">{filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}</span><button className="control-primary" type="button" onClick={() => { setDraft(blankProject); setProjectModal(true) }}><Plus size={17} />New project</button></div>
                  <div className="control-project-grid">{filteredProjects.map((project) => { const Icon = projectIcons[project.project_key] || BriefcaseBusiness; return <article className={`control-project-card control-project-${projectTones[project.project_key] || 'custom'}`} key={project.id}><div className="control-project-card-media" style={project.background_image_url ? { backgroundImage: `url(${JSON.stringify(project.background_image_url)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} aria-hidden="true" /><div className="control-project-card-body"><div className="control-project-card-top"><span className="control-project-monogram"><Icon size={20} strokeWidth={1.8} /></span><span className={`control-status ${project.is_active ? 'is-on' : ''}`}>{project.is_active ? 'Active' : 'Inactive'}</span></div><div className="control-project-card-copy"><span className="control-card-kicker">{project.category || 'WORKSPACE'}</span><h2>{project.project_name}</h2></div><div className="control-project-card-foot"><span><Users size={15} />{project.member_count} <span className="sr-only">{project.member_count === 1 ? 'member' : 'members'}</span></span><span className={`control-url-state ${project.project_url ? 'is-set' : ''}`}><Globe2 size={15} />{project.project_url ? 'URL set' : 'URL needed'}</span><button type="button" onClick={() => { setDraft(projectDraft(project)); setProjectModal(true) }}>Edit</button></div></div></article> })}{filteredProjects.length === 0 && <div className="control-panel"><Empty text="No projects found." /></div>}</div>
                </div>
              )}

              {tab === 'access' && (
                <div className="control-content">
                  <div className="control-toolbar"><label className="control-search"><Search size={17} /><input value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)} placeholder="Search people" aria-label="Search people" /></label><label className="control-select"><SlidersHorizontal size={16} /><span className="sr-only">Project</span><select value={accessProject} onChange={(event) => setAccessProject(event.target.value)}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}</select><ChevronDown size={15} /></label><span className="control-result-count">{accessPeople.length} {accessPeople.length === 1 ? 'person' : 'people'}</span></div>
                  <div className="control-panel control-matrix-wrap"><table className={`control-matrix${accessProject ? ' is-filtered' : ''}`}><thead><tr><th>Person</th>{accessProjects.map((project) => <th key={project.id}>{project.project_name}</th>)}</tr></thead><tbody>{accessPeople.map((person) => <tr key={person.id}><th><strong>{person.name}</strong><small>{person.role}</small></th>{accessProjects.map((project) => { const granted = grantSet.has(`${person.id}:${project.id}`); return <td key={project.id}><button className={`control-grant ${granted ? 'is-granted' : ''}`} type="button" disabled={busy || !person.is_active || !project.is_active} aria-label={`${granted ? 'Remove' : 'Grant'} ${person.name} access to ${project.project_name}`} aria-pressed={granted} onClick={() => { void setGrant(person.id, project.id, !granted) }}>{granted ? <Check size={17} /> : <Plus size={17} />}</button></td> })}</tr>)}</tbody></table>{(!accessPeople.length || !accessProjects.length) && <Empty text="No access records found." />}</div>
                </div>
              )}

              {tab === 'activity' && (
                <div className="control-content">
                  <div className="control-activity-intro">
                    <div><span className="control-section-kicker">TRACKING</span><p>Sign-ins, project entry and session time in one view.</p></div>
                    <div className="control-toolbar control-filters"><label className="control-select"><Users size={16} /><span className="sr-only">Person</span><select value={activityUser} onChange={(event) => { setActivityUser(event.target.value); setShownSessions(6); setShownEvents(6) }}><option value="">Everyone</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><ChevronDown size={15} /></label><label className="control-select"><BriefcaseBusiness size={16} /><span className="sr-only">Project</span><select value={activityProject} onChange={(event) => { setActivityProject(event.target.value); setShownSessions(6); setShownEvents(6) }}><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}</select><ChevronDown size={15} /></label></div>
                  </div>
                  <div className="control-stat-grid control-stat-grid-three control-activity-stats"><Stat label="Connect sign-ins" value={loginCount} icon={KeyRound} detail={`${days} days`} /><Stat label="Project entries" value={projectLogins} icon={BriefcaseBusiness} detail={`${days} days`} /><Stat label="Time in Connect" value={duration(totalDuration)} icon={Clock3} detail="Estimated" /></div>
                  <div className="control-insights-grid">
                    <ActivityTrend key={days} buckets={trend} days={days} limited={sessions.length >= 300 || events.length >= 300} />
                    <section className="control-panel control-browser-card">
                      <div className="control-insight-heading"><div><span className="control-section-kicker">DEVICE INSIGHT</span><h2>Browsers used</h2></div><span className="control-insight-icon"><Globe2 size={20} strokeWidth={1.8} /></span></div>
                      <div className="control-browser-overview"><div className="control-browser-summary"><strong>{sessions.length}</strong><span>{sessions.length >= 300 ? 'Recent' : 'Connect'} {sessions.length === 1 ? 'session' : 'sessions'}</span></div><div className="control-browser-donut" style={browserGradient ? { background: browserGradient } : undefined} aria-hidden="true"><span>{browserCounts.length ? `${Math.round(browserCounts[0][1] / sessions.length * 100)}%` : '—'}<small>top share</small></span></div></div>
                      <div className="control-browser-bars">{browserCounts.length ? browserCounts.map(([name, count], index) => <div key={name} className="control-browser-row"><div><span><i className="control-browser-swatch" style={{ background: browserPalette[index % browserPalette.length] }} />{name}</span><strong>{count} <small>({Math.round(count / sessions.length * 100)}%)</small></strong></div><div className="control-browser-track"><i style={{ width: `${count / sessions.length * 100}%`, background: browserPalette[index % browserPalette.length] }} /></div></div>) : <p className="control-browser-empty">No browser activity yet.</p>}</div>
                    </section>
                  </div>
                  <div className="control-activity-detail-grid">
                    <section className="control-panel"><div className="control-panel-head"><h2>Recent sessions</h2><span className="control-panel-count">{sessions.length}{sessions.length >= 300 ? ' recent' : ' total'}</span></div><div className="control-session-list">{sessions.slice(0, shownSessions).map((session) => <div key={session.id}><span className="control-session-icon"><Globe2 size={17} /></span><div><strong>{session.user_name}</strong><small>{browserName(session.user_agent)} · {time(session.created_at)}</small></div><b>{duration(session.duration_seconds)}</b></div>)}{sessions.length === 0 && <Empty text="No sessions in this period." />}</div>{sessions.length > shownSessions && <button className="control-list-more" type="button" onClick={() => setShownSessions((count) => count + 6)}>Show more sessions</button>}</section>
                    <section className="control-panel"><div className="control-panel-head"><h2>Event timeline</h2><span className="control-panel-count">{events.length}{events.length >= 300 ? ' recent' : ' events'}</span></div><ActivityList events={events.slice(0, shownEvents)} />{events.length > shownEvents && <button className="control-list-more" type="button" onClick={() => setShownEvents((count) => count + 6)}>Show more events</button>}</section>
                  </div>
                  <p className="control-activity-note">Session time is estimated from activity in Connect. Project entries count completed sign-ins.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {personModal && <div className="control-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closePersonModal() }}><section className="control-modal" role="dialog" aria-modal="true" aria-labelledby="new-person-title"><div className="control-modal-head"><div><span>TEAM DIRECTORY</span><h2 id="new-person-title">Create user</h2></div><button type="button" onClick={closePersonModal} aria-label="Close"><X size={19} /></button></div><form onSubmit={(event) => { void createPerson(event) }}><div className="control-form-grid"><label>Full name<input required maxLength={160} value={newPerson.name} onChange={(event) => setNewPerson({ ...newPerson, name: event.target.value })} /></label><label>Role<select value={newPerson.role} onChange={(event) => setNewPerson({ ...newPerson, role: event.target.value as Role })}><option value="management">Management</option><option value="developer">Developer</option><option value="admin">Admin</option></select></label><label>Mobile number<span className="control-mobile-field">+91 <input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={newPerson.mobile} onChange={(event) => setNewPerson({ ...newPerson, mobile: event.target.value.replace(/\D/g, '') })} /></span></label><label>Company email<input required type="email" pattern="[^@ ]+@vensar\.com" value={newPerson.email} onChange={(event) => setNewPerson({ ...newPerson, email: event.target.value })} /></label><label>Department<input maxLength={120} value={newPerson.department} onChange={(event) => setNewPerson({ ...newPerson, department: event.target.value })} /></label><label>Designation<input maxLength={120} value={newPerson.designation} onChange={(event) => setNewPerson({ ...newPerson, designation: event.target.value })} /></label><label className="control-form-full">Temporary password<input required type="password" minLength={10} autoComplete="new-password" value={newPerson.password} onChange={(event) => setNewPerson({ ...newPerson, password: event.target.value })} /><small>At least 10 characters. Share it with the user through a secure channel.</small></label></div>{error && <p className="control-modal-error" role="alert">{error}</p>}<div className="control-form-actions"><button type="button" onClick={closePersonModal}>Cancel</button><button className="control-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button></div></form></section></div>}
      {projectModal && <div className="control-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProjectModal(false) }}><section className="control-modal" role="dialog" aria-modal="true" aria-labelledby="project-editor-title"><div className="control-modal-head"><div><span>PROJECT DIRECTORY</span><h2 id="project-editor-title">{draft.id ? 'Edit project' : 'New project'}</h2></div><button type="button" onClick={() => setProjectModal(false)} aria-label="Close"><X size={19} /></button></div><form onSubmit={(event) => { void saveProject(event) }}><div className="control-form-grid"><label>Project name<input required maxLength={160} value={draft.projectName} onChange={(event) => setDraft({ ...draft, projectName: event.target.value })} /></label><label>Project key<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="railgrid" value={draft.projectKey} onChange={(event) => setDraft({ ...draft, projectKey: event.target.value.toLowerCase() })} /></label><label>Category<input maxLength={80} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label><label>Project URL<input type="url" placeholder="https://…" value={draft.projectUrl} onChange={(event) => setDraft({ ...draft, projectUrl: event.target.value })} /></label><label className="control-form-full">Description<input maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>Background image URL<input type="url" value={draft.backgroundImageUrl} onChange={(event) => setDraft({ ...draft, backgroundImageUrl: event.target.value })} /></label><label>Logo URL<input type="url" value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} /></label><label className="control-toggle-label"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active project</label></div>{error && <p className="control-modal-error" role="alert">{error}</p>}<div className="control-form-actions"><button type="button" onClick={() => setProjectModal(false)}>Cancel</button><button className="control-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save project'}</button></div></form></section></div>}
      {signOutModal && <div className="control-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSignOutModal(false) }}><section className="control-modal control-confirm" role="dialog" aria-modal="true" aria-labelledby="control-signout-title"><div className="control-modal-head"><div><span>VENSAR CONNECT</span><h2 id="control-signout-title">Sign out?</h2></div><button type="button" onClick={() => setSignOutModal(false)} aria-label="Close"><X size={19} /></button></div><p>You’ll return to the sign in page.</p><div className="control-form-actions"><button type="button" onClick={() => setSignOutModal(false)}>Stay signed in</button><button className="control-primary" type="button" disabled={busy} onClick={() => { setBusy(true); void onSignOut().catch((cause) => { setError(cause instanceof Error ? cause.message : 'Could not sign out.'); setSignOutModal(false) }).finally(() => setBusy(false)) }}>Sign out</button></div></section></div>}
    </main>
  )
}

function Stat({ label, value, icon: Icon, detail }: { label: string; value: number | string; icon: typeof Users; detail: string }) {
  return <div className="control-stat">
    <div className="control-stat-head"><span className="control-stat-label">{label}</span><span className="control-stat-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span></div>
    <div className="control-stat-bottom"><strong>{value}</strong><small>{detail}</small></div>
  </div>
}

function ActivityTrend({ buckets, days, limited }: { buckets: ActivityBucket[]; days: 7 | 30 | 90; limited: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(buckets.length - 1)
  const activeIndex = Math.min(selectedIndex, buckets.length - 1)
  const activeBucket = buckets[activeIndex]
  const maximum = Math.max(1, ...buckets.flatMap((bucket) => [bucket.connect, bucket.projects]))
  const total = buckets.reduce((sum, bucket) => sum + bucket.connect + bucket.projects, 0)
  const interval = days === 90 ? '7-day' : '24-hour'
  return <section className="control-panel control-trend-panel" aria-labelledby="control-trend-title">
    <div className="control-insight-heading"><div><span className="control-section-kicker">ACTIVITY OVER TIME</span><h2 id="control-trend-title">Sign-in trend</h2></div><span className="control-trend-period">{interval} windows</span></div>
    <div className="control-trend-legend"><span><i className="is-connect" />Connect sign-ins</span><span><i className="is-project" />Project entries</span></div>
    {total > 0 ? <div className="control-trend-chart">
      <div className="control-trend-axis" aria-hidden="true"><span>{maximum}</span><span>{Math.ceil(maximum / 2)}</span><span>0</span></div>
      <div className="control-trend-main">
        <div className={`control-trend-plot${days === 30 ? ' is-daily-month' : ''}`} aria-label="Sign-ins by time period" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
          {buckets.map((bucket, index) => <button className={`control-trend-group${activeIndex === index ? ' is-selected' : ''}`} type="button" key={index} aria-label={`${bucket.range}: ${bucket.connect} Connect sign-ins, ${bucket.projects} project entries`} aria-pressed={activeIndex === index} title={`${bucket.range}: ${bucket.connect} Connect sign-ins, ${bucket.projects} project entries`} onClick={() => setSelectedIndex(index)}>
            <span className="control-trend-bar is-connect" style={{ height: bucket.connect ? `${Math.max(5, bucket.connect / maximum * 100)}%` : '0%' }} aria-hidden="true" />
            <span className="control-trend-bar is-project" style={{ height: bucket.projects ? `${Math.max(5, bucket.projects / maximum * 100)}%` : '0%' }} aria-hidden="true" />
          </button>)}
        </div>
        <div className={`control-trend-labels${days === 30 ? ' is-daily-month' : ''}`} aria-hidden="true" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>{buckets.map((bucket, index) => <span key={index}>{bucket.label}</span>)}</div>
      </div>
    </div> : <div className="control-trend-empty"><Activity size={25} strokeWidth={1.5} /><span>No sign-ins in this period</span></div>}
    {total > 0 && <div className="control-trend-selection"><strong>{activeBucket.range}</strong><span>{activeBucket.connect} Connect sign-ins <i /> {activeBucket.projects} project entries</span></div>}
    {limited && <p className="control-trend-limit">Trend uses recent records; totals above include all sign-ins.</p>}
  </section>
}

function ActivityList({ events }: { events: Event[] }) {
  return <div className="control-activity-list">{events.map((event) => {
    const isProject = event.event_type.startsWith('project_')
    const isFailure = event.event_type.includes('failed')
    const Icon = isProject ? BriefcaseBusiness : event.event_type === 'logout' ? LogOut : event.event_type.startsWith('login_') ? KeyRound : Activity
    return <div key={event.id}><span className={`control-activity-icon${isProject ? ' is-project' : ''}${isFailure ? ' is-failed' : ''}`}><Icon size={16} strokeWidth={1.8} /></span><div><strong>{eventLabels[event.event_type] || event.event_type.replaceAll('_', ' ')}</strong><small>{event.user_name || 'System'}{event.project_name ? ` · ${event.project_name}` : ''} · {browserName(event.user_agent)}</small></div><time dateTime={event.occurred_at}>{time(event.occurred_at)}</time></div>
  })}{events.length === 0 && <Empty text="No activity yet." />}</div>
}

function Empty({ text }: { text: string }) { return <div className="control-empty">{text}</div> }
