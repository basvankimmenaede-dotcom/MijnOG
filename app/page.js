'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const tabs = ['Home', 'Agenda', 'Stats', 'Team', 'Meer']

export default function HomePage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('Home')
  const [profile, setProfile] = useState(null)
  const [teams, setTeams] = useState([])
  const [calendar, setCalendar] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      setTeams([])
      setCalendar(null)
      return
    }
    loadUserData(session.user.id)
  }, [session])

  async function loadUserData(userId) {
    setLoading(true)
    setMessage('')

    const [{ data: profileData, error: profileError }, { data: teamData, error: teamError }, { data: calendarData, error: calendarError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('team_members').select('member_role, teams(id, name, sport)').eq('profile_id', userId),
      supabase.from('calendar_connections').select('*').eq('profile_id', userId).eq('provider', 'foys').maybeSingle()
    ])

    if (profileError) setMessage(`Profiel kon niet worden geladen: ${profileError.message}`)
    else setProfile(profileData)

    if (!teamError) setTeams((teamData ?? []).map(row => ({ ...row.teams, member_role: row.member_role })))
    if (!calendarError) setCalendar(calendarData)

    setLoading(false)
  }

  if (loading && !session) return <main className="center"><div className="loader">Mijn OG laden…</div></main>
  if (!session) return <Login onMessage={setMessage} message={message} />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">OG</div>
        <div>
          <div className="eyebrow">ONZE GEZELLEN</div>
          <div className="brand-name">Mijn OG</div>
        </div>
      </header>

      <section className="content">
        {message && <div className="notice">{message}</div>}
        {activeTab === 'Home' && <Dashboard profile={profile} teams={teams} calendar={calendar} />}
        {activeTab === 'Agenda' && <Agenda calendar={calendar} onGoMore={() => setActiveTab('Meer')} />}
        {activeTab === 'Stats' && <EmptyPanel title="Mijn stats" text="Nog geen statistieken gekoppeld. Zodra we de stats-bron aansluiten verschijnen ze hier automatisch." />}
        {activeTab === 'Team' && <Team teams={teams} />}
        {activeTab === 'Meer' && <More session={session} profile={profile} calendar={calendar} onSaved={() => loadUserData(session.user.id)} onMessage={setMessage} />}
      </section>

      <nav className="bottom-nav" aria-label="Hoofdnavigatie">
        {tabs.map(tab => (
          <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(tab)}>
            <span>{iconFor(tab)}</span>
            <small>{tab}</small>
          </button>
        ))}
      </nav>
    </main>
  )
}

function Login({ onMessage, message }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setBusy(true)
    onMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) onMessage(error.message)
    setBusy(false)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="big-logo">OG</div>
        <p className="eyebrow orange">ONZE GEZELLEN</p>
        <h1>Mijn OG</h1>
        <p className="muted">Jouw team. Jouw stats. Jouw club.</p>
        <form onSubmit={signIn} className="form-stack">
          <label>E-mailadres<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Wachtwoord<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          <button className="primary" disabled={busy}>{busy ? 'Inloggen…' : 'Inloggen'}</button>
        </form>
        {message && <div className="notice error">{message}</div>}
        <p className="helper">Gebruik voorlopig het testaccount dat je in Supabase Authentication hebt aangemaakt.</p>
      </div>
    </main>
  )
}

function Dashboard({ profile, teams, calendar }) {
  const name = profile?.first_name?.trim() || 'Gezel'
  const teamName = teams[0]?.name || 'Nog geen team gekoppeld'
  return (
    <>
      <div className="hero">
        <p className="eyebrow">MIJN OG</p>
        <h1>Hoi {name}! 👋</h1>
        <p>{teamName}</p>
      </div>

      <section className="card accent-card">
        <div className="section-row"><h2>Volgende activiteit</h2><span className="pill">Agenda</span></div>
        <p className="muted">Zodra je FOYS-agenda en later de teamtrainingen zijn gekoppeld, verschijnt hier je eerstvolgende activiteit.</p>
        <div className="empty-state">{calendar ? 'KNBSB-agenda gekoppeld ✓' : 'Nog geen KNBSB-agenda gekoppeld'}</div>
      </section>

      <section>
        <div className="section-row"><h2>Mijn seizoen</h2><span className="muted small">Live data later</span></div>
        <div className="metric-grid">
          {['AVG', 'OBP', 'Hits', 'RBI'].map(label => <div className="metric-card" key={label}><span>{label}</span><strong>—</strong></div>)}
        </div>
      </section>

      <section className="card highlight-card">
        <div className="section-row"><h2>🏆 OG Highlight</h2></div>
        <p className="muted">Nog geen echte clubhighlight geplaatst. Deze module koppelen we later aan de clubbrede highlights.</p>
      </section>
    </>
  )
}

function Agenda({ calendar, onGoMore }) {
  return (
    <section>
      <div className="hero compact"><p className="eyebrow">AGENDA</p><h1>Mijn agenda</h1></div>
      {calendar ? (
        <div className="card">
          <span className="status-ok">✓ KNBSB/FOYS gekoppeld</span>
          <h2>Wedstrijden worden de volgende stap</h2>
          <p className="muted">De URL is veilig opgeslagen in Supabase. Hierna bouwen we de synchronisatie die de ICS-feed uitleest en echte wedstrijden toont.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Koppel je KNBSB-agenda</h2>
          <p className="muted">Voeg je persoonlijke FOYS-link toe onder Meer.</p>
          <button className="primary" onClick={onGoMore}>Naar koppelingen</button>
        </div>
      )}
    </section>
  )
}

function Team({ teams }) {
  return (
    <section>
      <div className="hero compact"><p className="eyebrow">TEAM</p><h1>Mijn team</h1></div>
      {teams.length ? teams.map(team => (
        <div className="card" key={team.id}><div className="section-row"><h2>{team.name}</h2><span className="pill">{team.sport}</span></div><p className="muted">Rol: {team.member_role}</p></div>
      )) : <EmptyPanel title="Nog geen team" text="Je testaccount is nog niet gekoppeld aan een team. Dat kunnen we straks via de beheeromgeving doen." />}
    </section>
  )
}

function More({ session, profile, calendar, onSaved, onMessage }) {
  const [icsUrl, setIcsUrl] = useState(calendar?.ics_url ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => setIcsUrl(calendar?.ics_url ?? ''), [calendar])

  async function saveCalendar() {
    const url = icsUrl.trim()
    if (!url.includes('api.foys.io') || !url.endsWith('/ics')) {
      onMessage('Dit lijkt geen geldige persoonlijke FOYS/KNBSB ICS-link.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('calendar_connections').upsert({
      profile_id: session.user.id,
      provider: 'foys',
      ics_url: url,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'profile_id,provider' })
    setBusy(false)
    if (error) onMessage(`Opslaan mislukt: ${error.message}`)
    else {
      onMessage('KNBSB-agenda gekoppeld ✓')
      onSaved()
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <section>
      <div className="hero compact"><p className="eyebrow">ACCOUNT</p><h1>Meer</h1><p>{profile?.first_name || session.user.email}</p></div>
      <div className="card">
        <h2>KNBSB agenda</h2>
        <p className="muted">Plak je persoonlijke FOYS ICS-link. Deze wordt privé aan jouw account gekoppeld.</p>
        <label className="field-label">Persoonlijke ICS-link<textarea rows="4" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://api.foys.io/competition/public-api/v1/persons/.../ics" /></label>
        <button className="primary" onClick={saveCalendar} disabled={busy}>{busy ? 'Opslaan…' : calendar ? 'Koppeling bijwerken' : 'Agenda koppelen'}</button>
        {calendar && <p className="status-ok">✓ Gekoppeld aan jouw account</p>}
      </div>
      <button className="secondary danger" onClick={signOut}>Uitloggen</button>
    </section>
  )
}

function EmptyPanel({ title, text }) {
  return <section><div className="hero compact"><p className="eyebrow">MIJN OG</p><h1>{title}</h1></div><div className="card"><p className="muted">{text}</p></div></section>
}

function iconFor(tab) {
  return ({ Home: '⌂', Agenda: '▣', Stats: '▥', Team: '♙', Meer: '☰' })[tab]
}
