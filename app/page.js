'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const tabs = ['Home', 'Agenda', 'Stats', 'Team', 'Meer']

export default function HomePage() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('Home')
  const [profile, setProfile] = useState(null)
  const [teams, setTeams] = useState([])
  const [calendarConnection, setCalendarConnection] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [calendarState, setCalendarState] = useState({ loading: false, error: '' })
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(newSession)
      setAuthReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      setTeams([])
      setCalendarConnection(null)
      setCalendarEvents([])
      return
    }
    loadUserData(session.user.id, session.access_token)
  }, [session?.user?.id])

  async function loadUserData(userId, accessToken = session?.access_token) {
    setLoading(true)
    setMessage('')

    const [profileResult, teamResult, calendarResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('team_members').select('member_role, teams(id, name, sport)').eq('profile_id', userId),
      supabase.from('calendar_connections').select('*').eq('profile_id', userId).eq('provider', 'foys').maybeSingle()
    ])

    if (profileResult.error) setMessage(`Profiel kon niet worden geladen: ${profileResult.error.message}`)
    else setProfile(profileResult.data)

    if (teamResult.error) setMessage(`Teamgegevens konden niet worden geladen: ${teamResult.error.message}`)
    else setTeams((teamResult.data ?? []).filter(row => row.teams).map(row => ({ ...row.teams, member_role: row.member_role })))

    if (calendarResult.error) {
      setMessage(`Agendakoppeling kon niet worden geladen: ${calendarResult.error.message}`)
      setCalendarConnection(null)
    } else {
      setCalendarConnection(calendarResult.data)
      if (calendarResult.data?.is_active && accessToken) await loadCalendar(accessToken)
      else setCalendarEvents([])
    }

    setLoading(false)
  }

  async function loadCalendar(accessToken = session?.access_token) {
    if (!accessToken) return
    setCalendarState({ loading: true, error: '' })
    try {
      const response = await fetch('/api/calendar', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Agenda kon niet worden geladen.')
      setCalendarEvents(payload.events ?? [])
      setCalendarState({ loading: false, error: '' })
    } catch (error) {
      setCalendarEvents([])
      setCalendarState({ loading: false, error: error.message })
    }
  }

  if (!authReady) return <main className="center"><div className="loader">Mijn OG laden…</div></main>
  if (recoveryMode) return <PasswordRecovery onDone={() => setRecoveryMode(false)} />
  if (!session) return <Login onMessage={setMessage} message={message} />

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/og-logo.png" alt="Onze Gezellen" />
          <div>
            <div className="eyebrow">ONZE GEZELLEN</div>
            <div className="brand-name">Mijn OG</div>
          </div>
        </div>
        <div className="topbar-dot" aria-hidden="true" />
      </header>

      <section className="content">
        {message && <div className="notice">{message}</div>}
        {loading && <div className="subtle-loading">Gegevens bijwerken…</div>}
        {activeTab === 'Home' && <Dashboard profile={profile} teams={teams} calendarEvents={calendarEvents} calendarConnection={calendarConnection} calendarState={calendarState} onAgenda={() => setActiveTab('Agenda')} />}
        {activeTab === 'Agenda' && <Agenda events={calendarEvents} connection={calendarConnection} state={calendarState} onRefresh={() => loadCalendar()} onGoMore={() => setActiveTab('Meer')} />}
        {activeTab === 'Stats' && <EmptyPanel eyebrow="STATS" title="Mijn stats" text="Nog geen statistieken beschikbaar. Zodra een echte databron is gekoppeld, verschijnen jouw cijfers hier automatisch." />}
        {activeTab === 'Team' && <Team teams={teams} />}
        {activeTab === 'Meer' && <More session={session} profile={profile} calendar={calendarConnection} onSaved={() => loadUserData(session.user.id)} onMessage={setMessage} />}
      </section>

      <nav className="bottom-nav" aria-label="Hoofdnavigatie">
        {tabs.map(tab => (
          <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(tab)}>
            <span className="nav-icon" aria-hidden="true">{iconFor(tab)}</span>
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
  const [resetBusy, setResetBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setBusy(true)
    setResetSent(false)
    onMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) onMessage(error.message)
    setBusy(false)
  }

  async function forgotPassword() {
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      onMessage('Vul eerst je e-mailadres in.')
      return
    }
    setResetBusy(true)
    onMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin
    })
    setResetBusy(false)
    if (error) onMessage(error.message)
    else setResetSent(true)
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <img src="/og-logo.png" className="login-logo" alt="Onze Gezellen Honk- & Softbal" />
          <div>
            <p className="eyebrow orange">ONZE GEZELLEN HONK- & SOFTBAL</p>
            <h1>Mijn OG</h1>
            <p className="muted no-margin">Jouw team. Jouw stats. Jouw club.</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Welkom terug</h2>
          <p className="muted">Log in met je Mijn OG-account.</p>
          <form onSubmit={signIn} className="form-stack">
            <label>E-mailadres<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label>Wachtwoord<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
            <button className="primary" disabled={busy}>{busy ? 'Inloggen…' : 'Inloggen'}</button>
          </form>
          <button type="button" className="text-button" onClick={forgotPassword} disabled={resetBusy}>{resetBusy ? 'Resetmail versturen…' : 'Wachtwoord vergeten?'}</button>
          {resetSent && <div className="notice success">Resetmail verstuurd. Open de link in de e-mail om een nieuw wachtwoord te kiezen.</div>}
          {message && <div className="notice error">{message}</div>}
        </div>
      </div>
    </main>
  )
}

function PasswordRecovery({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  async function updatePassword(e) {
    e.preventDefault()
    if (password.length < 8) return setMessage('Gebruik minimaal 8 tekens.')
    if (password !== confirm) return setMessage('De wachtwoorden zijn niet gelijk.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setMessage(error.message)
    else {
      setMessage('')
      setSaved(true)
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-brand"><img src="/og-logo.png" className="login-logo" alt="Onze Gezellen" /><div><p className="eyebrow orange">MIJN OG</p><h1>Nieuw wachtwoord</h1></div></div>
        <div className="login-card">
          {saved ? <><div className="notice success">Je wachtwoord is gewijzigd.</div><button className="primary" onClick={onDone}>Naar Mijn OG</button></> : (
            <form onSubmit={updatePassword} className="form-stack">
              <label>Nieuw wachtwoord<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required /></label>
              <label>Herhaal wachtwoord<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
              <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : 'Wachtwoord wijzigen'}</button>
              {message && <div className="notice error">{message}</div>}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

function Dashboard({ profile, teams, calendarEvents, calendarConnection, calendarState, onAgenda }) {
  const name = profile?.first_name?.trim() || 'Gezel'
  const teamName = teams[0]?.name || null
  const nextEvent = calendarEvents[0] || null

  return (
    <>
      <div className="welcome-block">
        <p className="eyebrow orange">MIJN OG</p>
        <h1>Hoi {name}! 👋</h1>
        <p className="muted no-margin">{teamName || 'Nog geen team gekoppeld'}</p>
      </div>

      <section className="feature-card">
        <div className="feature-kicker">VOLGENDE WEDSTRIJD</div>
        {calendarState.loading ? <p>Agenda laden…</p> : calendarState.error ? (
          <div className="empty-copy"><strong>Agenda kon niet worden geladen.</strong><span>{calendarState.error}</span></div>
        ) : nextEvent ? (
          <>
            <div className="event-date-line">{formatLongDate(nextEvent.start)}</div>
            <h2 className="feature-title">{nextEvent.title}</h2>
            <div className="event-meta">{formatTimeRange(nextEvent.start, nextEvent.end)}</div>
            {nextEvent.location && <div className="event-meta">📍 {nextEvent.location}</div>}
            <button className="feature-link" onClick={onAgenda}>Bekijk agenda →</button>
          </>
        ) : calendarConnection ? (
          <div className="empty-copy"><strong>Geen komende wedstrijden gevonden.</strong><span>Je FOYS-agenda is wel gekoppeld.</span></div>
        ) : (
          <div className="empty-copy"><strong>Nog geen KNBSB-agenda gekoppeld.</strong><span>Voeg je persoonlijke FOYS-link toe onder Meer.</span></div>
        )}
      </section>

      <section className="section-block">
        <div className="section-row"><div><p className="section-kicker">PERSOONLIJK</p><h2>Mijn stats</h2></div></div>
        <div className="plain-empty">Nog geen statistieken beschikbaar.</div>
      </section>

      <section className="section-block">
        <div className="section-row"><div><p className="section-kicker">CLUBBREED</p><h2>OG Highlight</h2></div></div>
        <div className="plain-empty">Nog geen clubhighlight geplaatst.</div>
      </section>
    </>
  )
}

function Agenda({ events, connection, state, onRefresh, onGoMore }) {
  const grouped = useMemo(() => groupByMonth(events), [events])
  return (
    <section>
      <PageHeader eyebrow="AGENDA" title="Mijn wedstrijden" subtitle="Jouw persoonlijke KNBSB-programma via FOYS." />

      {!connection ? (
        <div className="card empty-card"><h2>KNBSB-agenda koppelen</h2><p className="muted">Voeg onder Meer je persoonlijke FOYS ICS-link toe.</p><button className="primary" onClick={onGoMore}>Naar koppelingen</button></div>
      ) : state.loading ? (
        <div className="card"><p>Wedstrijden laden…</p></div>
      ) : state.error ? (
        <div className="card"><h2>Agenda kon niet worden geladen</h2><p className="muted">{state.error}</p><button className="secondary" onClick={onRefresh}>Opnieuw proberen</button></div>
      ) : events.length === 0 ? (
        <div className="card empty-card"><span className="status-ok">✓ FOYS gekoppeld</span><h2>Geen komende wedstrijden</h2><p className="muted">Er staan op dit moment geen toekomstige wedstrijden in jouw persoonlijke feed.</p><button className="secondary" onClick={onRefresh}>Vernieuwen</button></div>
      ) : (
        <>
          <div className="agenda-toolbar"><span className="status-ok">✓ KNBSB gekoppeld</span><button className="text-button compact-text" onClick={onRefresh}>Vernieuwen</button></div>
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div className="agenda-month" key={month}>
              <h2>{month}</h2>
              <div className="event-list">
                {monthEvents.map(event => <EventRow event={event} key={event.uid || `${event.start}-${event.title}`} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

function EventRow({ event }) {
  const date = new Date(event.start)
  return (
    <article className="event-row">
      <div className="event-date-box"><span>{date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '').toUpperCase()}</span><strong>{date.getDate()}</strong><small>{date.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '').toUpperCase()}</small></div>
      <div className="event-body">
        <div className="event-type">⚾ KNBSB WEDSTRIJD</div>
        <h3>{event.title}</h3>
        <p>{formatTimeRange(event.start, event.end)}</p>
        {event.location && <p>📍 {event.location}</p>}
        {event.description && <details><summary>Meer informatie</summary><div className="event-description">{event.description}</div></details>}
      </div>
    </article>
  )
}

function Team({ teams }) {
  return (
    <section>
      <PageHeader eyebrow="TEAM" title="Mijn team" subtitle="Teams die aan jouw Mijn OG-profiel zijn gekoppeld." />
      {teams.length ? <div className="stack">{teams.map(team => (
        <div className="card" key={team.id}><div className="section-row"><h2>{team.name}</h2><span className="pill">{team.sport}</span></div><p className="muted no-margin">Rol: {translateRole(team.member_role)}</p></div>
      ))}</div> : <div className="card empty-card"><h2>Nog geen team gekoppeld</h2><p className="muted">Een beheerder kan jouw account aan het juiste team koppelen.</p></div>}
    </section>
  )
}

function More({ session, profile, calendar, onSaved, onMessage }) {
  const [icsUrl, setIcsUrl] = useState(calendar?.ics_url ?? '')
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)

  useEffect(() => setIcsUrl(calendar?.ics_url ?? ''), [calendar])
  useEffect(() => { setFirstName(profile?.first_name ?? ''); setLastName(profile?.last_name ?? '') }, [profile])

  async function saveProfile() {
    setProfileBusy(true)
    onMessage('')
    const { error } = await supabase.from('profiles').update({ first_name: firstName.trim(), last_name: lastName.trim() }).eq('id', session.user.id)
    setProfileBusy(false)
    if (error) onMessage(`Profiel opslaan mislukt: ${error.message}`)
    else { onMessage('Profiel opgeslagen ✓'); onSaved() }
  }

  async function saveCalendar() {
    const url = icsUrl.trim()
    if (!/^https:\/\/api\.foys\.io\/.+\/persons\/.+\/ics(?:\?.*)?$/i.test(url)) {
      onMessage('Dit lijkt geen geldige persoonlijke FOYS/KNBSB ICS-link.')
      return
    }
    setCalendarBusy(true)
    onMessage('')
    const { error } = await supabase.from('calendar_connections').upsert({
      profile_id: session.user.id,
      provider: 'foys',
      ics_url: url,
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'profile_id,provider' })
    setCalendarBusy(false)
    if (error) onMessage(`Opslaan mislukt: ${error.message}`)
    else { onMessage('KNBSB-agenda gekoppeld ✓'); onSaved() }
  }

  async function removeCalendar() {
    if (!calendar) return
    setCalendarBusy(true)
    onMessage('')
    const { error } = await supabase.from('calendar_connections').delete().eq('id', calendar.id).eq('profile_id', session.user.id)
    setCalendarBusy(false)
    if (error) onMessage(`Koppeling verwijderen mislukt: ${error.message}`)
    else { setIcsUrl(''); onMessage('KNBSB-agenda ontkoppeld.'); onSaved() }
  }

  async function signOut() { await supabase.auth.signOut() }

  return (
    <section>
      <PageHeader eyebrow="INSTELLINGEN" title="Mijn profiel" subtitle={session.user.email} />

      <div className="settings-section">
        <div className="settings-title"><span>01</span><div><h2>Persoonlijke gegevens</h2><p>Deze naam gebruiken we in Mijn OG.</p></div></div>
        <div className="card form-stack">
          <label>Voornaam<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" /></label>
          <label>Achternaam<input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" /></label>
          <button className="primary" onClick={saveProfile} disabled={profileBusy}>{profileBusy ? 'Opslaan…' : 'Naam opslaan'}</button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title"><span>02</span><div><h2>KNBSB agenda</h2><p>Je persoonlijke FOYS-link is alleen voor jouw account.</p></div></div>
        <div className="card form-stack">
          <label>Persoonlijke ICS-link<textarea rows="4" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://api.foys.io/competition/public-api/v1/persons/.../ics" /></label>
          <button className="primary" onClick={saveCalendar} disabled={calendarBusy}>{calendarBusy ? 'Opslaan…' : calendar ? 'Koppeling bijwerken' : 'Agenda koppelen'}</button>
          {calendar && <><p className="status-ok no-margin">✓ Gekoppeld aan jouw account</p><button className="text-button danger-text" onClick={removeCalendar} disabled={calendarBusy}>Koppeling verwijderen</button></>}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title"><span>03</span><div><h2>Account</h2><p>Beheer je sessie.</p></div></div>
        <button className="secondary danger" onClick={signOut}>Uitloggen</button>
      </div>
    </section>
  )
}

function PageHeader({ eyebrow, title, subtitle }) {
  return <div className="page-header"><p className="eyebrow orange">{eyebrow}</p><h1>{title}</h1>{subtitle && <p className="muted no-margin">{subtitle}</p>}</div>
}

function EmptyPanel({ eyebrow, title, text }) {
  return <section><PageHeader eyebrow={eyebrow} title={title} /><div className="card empty-card"><p className="muted no-margin">{text}</p></div></section>
}

function iconFor(tab) {
  return { Home: '⌂', Agenda: '▣', Stats: '▥', Team: '◎', Meer: '☰' }[tab]
}

function translateRole(role) {
  return { player: 'speler', coach: 'coach', admin: 'beheerder' }[role] || role || 'lid'
}

function formatLongDate(value) {
  return new Date(value).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTimeRange(start, end) {
  const startText = new Date(start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (!end) return `${startText} uur`
  const endText = new Date(end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `${startText} – ${endText} uur`
}

function groupByMonth(events) {
  return events.reduce((acc, event) => {
    const month = new Date(event.start).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    acc[month] ||= []
    acc[month].push(event)
    return acc
  }, {})
}
