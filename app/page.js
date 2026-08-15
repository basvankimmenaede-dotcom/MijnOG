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
          <span className="brand-name">Mijn OG</span>
        </div>
        <button className="icon-button" aria-label="Meldingen" title="Meldingen komen later">
          <Icon name="bell" />
          <span className="notification-dot" aria-hidden="true" />
        </button>
      </header>

      <section className="content">
        {message && <div className="notice">{message}</div>}
        {loading && <div className="subtle-loading">Gegevens bijwerken…</div>}
        {activeTab === 'Home' && (
          <Dashboard
            profile={profile}
            teams={teams}
            calendarEvents={calendarEvents}
            calendarConnection={calendarConnection}
            calendarState={calendarState}
            onAgenda={() => setActiveTab('Agenda')}
            onTeam={() => setActiveTab('Team')}
            onStats={() => setActiveTab('Stats')}
            onMore={() => setActiveTab('Meer')}
          />
        )}
        {activeTab === 'Agenda' && <Agenda events={calendarEvents} connection={calendarConnection} state={calendarState} onRefresh={() => loadCalendar()} onGoMore={() => setActiveTab('Meer')} />}
        {activeTab === 'Stats' && <Stats />}
        {activeTab === 'Team' && <Team teams={teams} />}
        {activeTab === 'Meer' && <More session={session} profile={profile} teams={teams} calendar={calendarConnection} onSaved={() => loadUserData(session.user.id)} onMessage={setMessage} />}
      </section>

      <nav className="bottom-nav" aria-label="Hoofdnavigatie">
        {tabs.map(tab => (
          <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab(tab)}>
            <Icon name={iconNameForTab(tab)} />
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
    else { setMessage(''); setSaved(true) }
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

function Dashboard({ profile, teams, calendarEvents, calendarConnection, calendarState, onAgenda, onTeam, onStats, onMore }) {
  const firstName = profile?.first_name?.trim() || ''
  const team = teams[0] || null
  const nextEvent = calendarEvents[0] || null
  const upcoming = calendarEvents.slice(0, 3)

  return (
    <>
      <section className="home-intro">
        <h1>{firstName ? `Hoi ${firstName}!` : 'Welkom bij Mijn OG'}</h1>
        <p className="muted no-margin">Alles wat voor jou en je team belangrijk is, op één plek.</p>
      </section>

      <section className="hero-event">
        <div className="hero-ball" aria-hidden="true" />
        <div className="hero-topline">
          <span>VOLGENDE WEDSTRIJD</span>
          {nextEvent && <span className="hero-badge">Wedstrijd</span>}
        </div>
        {calendarState.loading ? (
          <div className="hero-empty">Agenda laden…</div>
        ) : calendarState.error ? (
          <div className="hero-empty"><strong>Agenda kon niet worden geladen.</strong><span>{calendarState.error}</span></div>
        ) : nextEvent ? (
          <>
            <h2>{nextEvent.title}</h2>
            <div className="hero-meta"><Icon name="calendar" /> <span>{formatLongDate(nextEvent.start)}</span></div>
            <div className="hero-meta"><Icon name="clock" /> <span>{formatTimeRange(nextEvent.start, nextEvent.end)}</span></div>
            {nextEvent.location && <div className="hero-meta"><Icon name="pin" /> <span>{nextEvent.location}</span></div>}
            <button className="hero-action" onClick={onAgenda}>Wedstrijddetails <Icon name="arrow" /></button>
          </>
        ) : calendarConnection ? (
          <div className="hero-empty"><strong>Geen komende wedstrijden.</strong><span>Je FOYS-agenda is gekoppeld.</span><button className="hero-action" onClick={onAgenda}>Bekijk agenda <Icon name="arrow" /></button></div>
        ) : (
          <div className="hero-empty"><strong>Koppel je KNBSB-agenda.</strong><span>Voeg je persoonlijke FOYS-link toe om wedstrijden hier automatisch te zien.</span><button className="hero-action" onClick={onMore}>Agenda koppelen <Icon name="arrow" /></button></div>
        )}
      </section>

      <SectionTitle title="Komende activiteiten" action="Alles bekijken" onAction={onAgenda} />
      <section className="activity-card">
        {upcoming.length > 0 ? upcoming.map(event => <CompactEvent key={event.uid || `${event.start}-${event.title}`} event={event} />) : (
          <EmptyState icon="calendar" title="Geen activiteiten gevonden" text={calendarConnection ? 'Nieuwe KNBSB-wedstrijden verschijnen hier automatisch.' : 'Koppel je KNBSB-agenda om je programma te zien.'} />
        )}
      </section>

      <SectionTitle title="Mijn team" />
      {team ? (
        <button className="team-link-card" onClick={onTeam}>
          <span className="soft-icon"><Icon name="team" /></span>
          <span className="team-link-copy"><strong>{team.name}</strong><small>{capitalize(team.sport)} · {translateRole(team.member_role)}</small></span>
          <Icon name="chevron" />
        </button>
      ) : (
        <EmptyState icon="team" title="Nog geen team gekoppeld" text="Een beheerder kan jouw account aan het juiste team koppelen." />
      )}

      <SectionTitle title="Mijn stats" action="Bekijk stats" onAction={onStats} />
      <section className="stats-placeholder">
        <div><span className="stats-eyebrow">PERSOONLIJK</span><h3>Nog geen statistieken beschikbaar</h3><p>Zodra we een echte statsbron koppelen, verschijnen je prestaties hier automatisch.</p></div>
        <Icon name="stats" />
      </section>

      <SectionTitle title="Clubnieuws & highlights" />
      <EmptyState icon="trophy" title="Nog geen clubhighlight geplaatst" text="Clubbrede highlights verschijnen hier zodra er echte content is toegevoegd." />
    </>
  )
}

function CompactEvent({ event }) {
  const date = new Date(event.start)
  return (
    <article className="compact-event">
      <div className="compact-date"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '').toUpperCase()}</span></div>
      <div className="compact-event-copy">
        <strong>{event.title}</strong>
        <span>{formatShortDate(event.start)}</span>
        <small>{formatTimeRange(event.start, event.end)}{event.location ? ` · ${event.location}` : ''}</small>
      </div>
      <span className="type-chip">Wedstrijd</span>
    </article>
  )
}

function Agenda({ events, connection, state, onRefresh, onGoMore }) {
  const grouped = useMemo(() => groupByMonth(events), [events])
  return (
    <section>
      <ScreenHeader title="Komende activiteiten" action={connection ? 'Vernieuwen' : null} onAction={onRefresh} />
      <div className="filter-row">
        <span className="filter-chip active">Alles</span>
        <span className="filter-chip">Wedstrijden</span>
        <span className="filter-chip muted-chip">Trainingen later</span>
      </div>

      {!connection ? (
        <EmptyState icon="link" title="KNBSB-agenda koppelen" text="Voeg onder Meer je persoonlijke FOYS ICS-link toe." action="Naar koppelingen" onAction={onGoMore} />
      ) : state.loading ? (
        <EmptyState icon="calendar" title="Wedstrijden laden…" text="We halen je persoonlijke KNBSB-programma op." />
      ) : state.error ? (
        <EmptyState icon="calendar" title="Agenda kon niet worden geladen" text={state.error} action="Opnieuw proberen" onAction={onRefresh} />
      ) : events.length === 0 ? (
        <EmptyState icon="calendar" title="Geen komende activiteiten" text="Je FOYS-koppeling werkt. Nieuwe wedstrijden verschijnen hier automatisch." />
      ) : (
        <div className="agenda-timeline">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <section key={month} className="timeline-month">
              <h2>{month}</h2>
              {monthEvents.map(event => <TimelineEvent event={event} key={event.uid || `${event.start}-${event.title}`} />)}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function TimelineEvent({ event }) {
  const date = new Date(event.start)
  return (
    <article className="timeline-event">
      <div className="timeline-date"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '').toUpperCase()}</span></div>
      <div className="timeline-line" aria-hidden="true"><span /></div>
      <div className="timeline-copy">
        <div className="timeline-title-row"><h3>{event.title}</h3><span className="type-chip">Wedstrijd</span></div>
        <p>{formatShortDate(event.start)}</p>
        <p>{formatTimeRange(event.start, event.end)}{event.location ? ` · ${event.location}` : ''}</p>
        {event.description && <details><summary>Meer informatie</summary><div className="event-description">{event.description}</div></details>}
      </div>
    </article>
  )
}

function Stats() {
  return (
    <section>
      <ScreenHeader title="Jouw stats" />
      <div className="segmented"><span className="active">Overzicht</span><span>Aanvallen</span><span>Verdedigen</span></div>
      <EmptyState icon="stats" title="Nog geen statistieken beschikbaar" text="Hier tonen we alleen echte data. Zodra een statsbron is gekoppeld, verschijnt jouw persoonlijke overzicht hier." />
    </section>
  )
}

function Team({ teams }) {
  return (
    <section>
      <ScreenHeader title="Mijn team" />
      {teams.length ? (
        <div className="team-grid">
          {teams.map(team => (
            <article className="team-card" key={team.id}>
              <span className="soft-icon large"><Icon name="team" /></span>
              <div><h2>{team.name}</h2><p>{capitalize(team.sport)} · {translateRole(team.member_role)}</p></div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon="team" title="Nog geen team gekoppeld" text="Een beheerder kan jouw account aan het juiste team koppelen." />}

      <SectionTitle title="Teamgegevens" />
      <EmptyState icon="stats" title="Nog geen teamstatistieken beschikbaar" text="Teamstats verschijnen hier zodra we een echte statistiekbron koppelen." />
    </section>
  )
}

function AdminPanel({ onMessage, onChanged }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu')
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [seasonForm, setSeasonForm] = useState({ name: '', starts_on: '', ends_on: '' })
  const [teamForm, setTeamForm] = useState({ name: '', sport: 'softbal', season_id: '' })
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  useEffect(() => {
    if (open) loadAdminData()
  }, [open])

  async function loadAdminData() {
    setLoading(true)
    const [seasonResult, teamResult, profileResult, memberResult] = await Promise.all([
      supabase.from('seasons').select('*').order('starts_on', { ascending: false }),
      supabase.from('teams').select('id,name,sport,is_active,season_id,seasons(name,is_active)').order('name'),
      supabase.from('profiles').select('id,first_name,last_name,jersey_number,role').order('first_name'),
      supabase.from('team_members').select('id,team_id,profile_id,member_role')
    ])
    if (seasonResult.error) onMessage(`Seizoenen laden mislukt: ${seasonResult.error.message}`)
    else {
      const rows = seasonResult.data ?? []
      setSeasons(rows)
      if (!selectedSeasonId && rows.length) {
        const active = rows.find(row => row.is_active) || rows[0]
        setSelectedSeasonId(String(active.id))
      }
    }
    if (teamResult.error) onMessage(`Teams laden mislukt: ${teamResult.error.message}`)
    else setTeams(teamResult.data ?? [])
    if (profileResult.error) onMessage(`Leden laden mislukt: ${profileResult.error.message}`)
    else setProfiles(profileResult.data ?? [])
    if (memberResult.error) onMessage(`Teamindeling laden mislukt: ${memberResult.error.message}`)
    else setMemberships(memberResult.data ?? [])
    setLoading(false)
  }

  function closeAdmin() {
    setOpen(false)
    setView('menu')
    setShowSeasonForm(false)
    setShowTeamForm(false)
    setMemberSearch('')
  }

  function goTo(nextView) {
    setView(nextView)
    setShowSeasonForm(false)
    setShowTeamForm(false)
    setMemberSearch('')
    if (nextView === 'members' && !selectedTeamId) {
      const candidate = teams.find(team => String(team.season_id) === String(selectedSeasonId) && team.is_active)
      if (candidate) setSelectedTeamId(String(candidate.id))
    }
  }

  async function addSeason(e) {
    e.preventDefault()
    if (!seasonForm.name.trim()) return
    setBusy(true); onMessage('')
    const { error } = await supabase.from('seasons').insert({
      name: seasonForm.name.trim(),
      starts_on: seasonForm.starts_on || null,
      ends_on: seasonForm.ends_on || null,
      is_active: seasons.length === 0
    })
    setBusy(false)
    if (error) return onMessage(`Seizoen toevoegen mislukt: ${error.message}`)
    setSeasonForm({ name: '', starts_on: '', ends_on: '' })
    setShowSeasonForm(false)
    onMessage('Seizoen toegevoegd ✓')
    await loadAdminData()
  }

  async function activateSeason(id) {
    setBusy(true); onMessage('')
    const current = seasons.find(s => s.is_active)
    if (current && current.id !== id) {
      const { error } = await supabase.from('seasons').update({ is_active: false }).eq('id', current.id)
      if (error) { setBusy(false); return onMessage(`Actief seizoen wijzigen mislukt: ${error.message}`) }
    }
    const { error } = await supabase.from('seasons').update({ is_active: true }).eq('id', id)
    setBusy(false)
    if (error) onMessage(`Actief seizoen wijzigen mislukt: ${error.message}`)
    else {
      setSelectedSeasonId(String(id))
      onMessage('Actief seizoen gewijzigd ✓')
      await loadAdminData()
      onChanged?.()
    }
  }

  async function addTeam(e) {
    e.preventDefault()
    if (!teamForm.name.trim() || !teamForm.season_id) return
    setBusy(true); onMessage('')
    const { error } = await supabase.from('teams').insert({
      name: teamForm.name.trim(), sport: teamForm.sport, season_id: Number(teamForm.season_id), is_active: true
    })
    setBusy(false)
    if (error) return onMessage(`Team toevoegen mislukt: ${error.message}`)
    setTeamForm({ name: '', sport: 'softbal', season_id: '' })
    setShowTeamForm(false)
    onMessage('Team toegevoegd ✓')
    await loadAdminData()
    onChanged?.()
  }

  async function toggleTeam(team) {
    setBusy(true); onMessage('')
    const { error } = await supabase.from('teams').update({ is_active: !team.is_active }).eq('id', team.id)
    setBusy(false)
    if (error) onMessage(`Team wijzigen mislukt: ${error.message}`)
    else {
      await loadAdminData()
      onChanged?.()
    }
  }

  async function addMember(profileId, role = 'player') {
    if (!selectedTeamId) return
    setBusy(true); onMessage('')
    const { error } = await supabase.from('team_members').insert({
      team_id: Number(selectedTeamId), profile_id: profileId, member_role: role
    })
    setBusy(false)
    if (error) onMessage(`Lid toevoegen mislukt: ${error.message}`)
    else {
      onMessage(`Lid toegevoegd als ${role === 'coach' ? 'coach' : 'speler'} ✓`)
      await loadAdminData()
      onChanged?.()
    }
  }

  async function changeMemberRole(membershipId, role) {
    setBusy(true); onMessage('')
    const { error } = await supabase.from('team_members').update({ member_role: role }).eq('id', membershipId)
    setBusy(false)
    if (error) onMessage(`Teamrol wijzigen mislukt: ${error.message}`)
    else {
      await loadAdminData()
      onChanged?.()
    }
  }

  async function removeMember(membership) {
    const person = profiles.find(profile => profile.id === membership.profile_id)
    const name = personName(person)
    if (!window.confirm(`${name} uit dit team verwijderen?`)) return
    setBusy(true); onMessage('')
    const { error } = await supabase.from('team_members').delete().eq('id', membership.id)
    setBusy(false)
    if (error) onMessage(`Lid verwijderen mislukt: ${error.message}`)
    else {
      onMessage('Lid uit team verwijderd.')
      await loadAdminData()
      onChanged?.()
    }
  }

  const seasonTeams = teams.filter(team => !selectedSeasonId || String(team.season_id) === String(selectedSeasonId))
  const selectedTeam = teams.find(team => String(team.id) === String(selectedTeamId))
  const currentMemberships = memberships.filter(row => String(row.team_id) === String(selectedTeamId))
  const currentProfileIds = new Set(currentMemberships.map(row => row.profile_id))
  const search = memberSearch.trim().toLowerCase()
  const availableProfiles = profiles.filter(profile => {
    if (currentProfileIds.has(profile.id)) return false
    if (!search) return true
    return `${personName(profile)} ${profile.jersey_number || ''}`.toLowerCase().includes(search)
  })

  return (
    <>
      <button className="admin-launcher" onClick={() => setOpen(true)}>
        <span className="settings-icon"><Icon name="settings" /></span>
        <span className="settings-copy"><strong>Clubbeheer</strong><small>Seizoenen, teams en teamindeling</small></span>
        <span className="admin-badge">Admin</span>
        <Icon name="chevron" />
      </button>

      {open && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) closeAdmin() }}>
          <section className="admin-sheet" role="dialog" aria-modal="true" aria-label="Clubbeheer">
            <div className="sheet-handle" aria-hidden="true" />
            <header className="sheet-header">
              {view !== 'menu' ? <button className="sheet-icon-button" onClick={() => setView('menu')} aria-label="Terug"><Icon name="back" /></button> : <span className="sheet-icon-spacer" />}
              <div><p className="eyebrow orange">BEHEERDER</p><h2>{view === 'menu' ? 'Clubbeheer' : view === 'seasons' ? 'Seizoenen' : view === 'teams' ? 'Teams' : 'Teamindeling'}</h2></div>
              <button className="sheet-icon-button" onClick={closeAdmin} aria-label="Sluiten"><Icon name="close" /></button>
            </header>

            {loading ? <div className="subtle-loading">Beheer laden…</div> : (
              <div className="sheet-body">
                {view === 'menu' && (
                  <div className="admin-menu-list">
                    <AdminMenuItem icon="calendar" title="Seizoenen" subtitle={`${seasons.length} seizoen${seasons.length === 1 ? '' : 'en'} · ${seasons.find(s => s.is_active)?.name || 'geen actief seizoen'}`} onClick={() => goTo('seasons')} />
                    <AdminMenuItem icon="team" title="Teams" subtitle={`${teams.filter(t => t.is_active).length} actieve teams`} onClick={() => goTo('teams')} />
                    <AdminMenuItem icon="people" title="Teamindeling" subtitle="Spelers en coaches koppelen" onClick={() => goTo('members')} />
                  </div>
                )}

                {view === 'seasons' && (
                  <div className="admin-block">
                    <SectionTitle title="Alle seizoenen" action={showSeasonForm ? 'Sluiten' : '+ Nieuw'} onAction={() => setShowSeasonForm(v => !v)} />
                    {showSeasonForm && <form className="sheet-form form-stack" onSubmit={addSeason}>
                      <label>Naam<input placeholder="2027" value={seasonForm.name} onChange={e => setSeasonForm({...seasonForm, name:e.target.value})} required /></label>
                      <div className="admin-form-grid"><label>Startdatum<input type="date" value={seasonForm.starts_on} onChange={e => setSeasonForm({...seasonForm, starts_on:e.target.value})} /></label><label>Einddatum<input type="date" value={seasonForm.ends_on} onChange={e => setSeasonForm({...seasonForm, ends_on:e.target.value})} /></label></div>
                      <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : 'Seizoen toevoegen'}</button>
                    </form>}
                    <div className="admin-list">
                      {seasons.map(season => <article className="admin-row" key={season.id}><div><strong>{season.name}</strong><small>{formatSeasonRange(season)}</small></div>{season.is_active ? <span className="active-badge">Actief</span> : <button className="mini-action" disabled={busy} onClick={() => activateSeason(season.id)}>Actief maken</button>}</article>)}
                      {!seasons.length && <div className="admin-empty">Nog geen seizoenen.</div>}
                    </div>
                  </div>
                )}

                {view === 'teams' && (
                  <div className="admin-block">
                    <div className="admin-filter-row">
                      <label>Seizoen<select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)}>{seasons.map(s => <option value={s.id} key={s.id}>{s.name}{s.is_active ? ' · actief' : ''}</option>)}</select></label>
                    </div>
                    <SectionTitle title="Teams" action={showTeamForm ? 'Sluiten' : '+ Team'} onAction={() => { setTeamForm(form => ({...form, season_id: form.season_id || selectedSeasonId})); setShowTeamForm(v => !v) }} />
                    {showTeamForm && <form className="sheet-form form-stack" onSubmit={addTeam}>
                      <label>Teamnaam<input placeholder="Softbal Dames 1" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name:e.target.value})} required /></label>
                      <div className="admin-form-grid"><label>Sport<select value={teamForm.sport} onChange={e => setTeamForm({...teamForm, sport:e.target.value})}><option value="softbal">Softbal</option><option value="honkbal">Honkbal</option></select></label><label>Seizoen<select value={teamForm.season_id || selectedSeasonId} onChange={e => setTeamForm({...teamForm, season_id:e.target.value})} required>{seasons.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label></div>
                      <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : 'Team toevoegen'}</button>
                    </form>}
                    <div className="admin-list">
                      {seasonTeams.map(team => <article className={`admin-row${team.is_active ? '' : ' inactive'}`} key={team.id}><div><strong>{team.name}</strong><small>{capitalize(team.sport)} · {team.is_active ? 'Actief' : 'Gearchiveerd'}</small></div><button className="mini-action" disabled={busy} onClick={() => toggleTeam(team)}>{team.is_active ? 'Archiveren' : 'Activeren'}</button></article>)}
                      {!seasonTeams.length && <div className="admin-empty">Geen teams in dit seizoen.</div>}
                    </div>
                  </div>
                )}

                {view === 'members' && (
                  <div className="admin-block team-members-admin">
                    <div className="admin-form-grid">
                      <label>Seizoen<select value={selectedSeasonId} onChange={e => { const id=e.target.value; setSelectedSeasonId(id); const first=teams.find(t => String(t.season_id)===String(id) && t.is_active); setSelectedTeamId(first ? String(first.id) : '') }}>{seasons.map(s => <option value={s.id} key={s.id}>{s.name}{s.is_active ? ' · actief' : ''}</option>)}</select></label>
                      <label>Team<select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}><option value="">Kies team</option>{seasonTeams.filter(team => team.is_active).map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
                    </div>

                    {!selectedTeam ? <div className="admin-empty spacious">Kies eerst een team om de teamindeling te beheren.</div> : <>
                      <div className="team-member-summary"><div><p className="eyebrow orange">TEAM</p><h3>{selectedTeam.name}</h3></div><span>{currentMemberships.length} leden</span></div>

                      <SectionTitle title="Huidige teamleden" />
                      <div className="member-list">
                        {currentMemberships.map(membership => {
                          const person = profiles.find(profile => profile.id === membership.profile_id)
                          return <article className="member-row" key={membership.id}>
                            <span className="member-avatar">{initials(person)}</span>
                            <div className="member-copy"><strong>{personName(person)}</strong><small>{person?.jersey_number ? `#${person.jersey_number} · ` : ''}{person?.role === 'admin' ? 'Clubbeheerder' : 'Mijn OG-lid'}</small></div>
                            <select aria-label={`Teamrol van ${personName(person)}`} value={membership.member_role} onChange={e => changeMemberRole(membership.id, e.target.value)} disabled={busy}><option value="player">Speler</option><option value="coach">Coach</option></select>
                            <button className="remove-member" onClick={() => removeMember(membership)} disabled={busy} aria-label={`${personName(person)} verwijderen`}><Icon name="trash" /></button>
                          </article>
                        })}
                        {!currentMemberships.length && <div className="admin-empty">Nog niemand aan dit team gekoppeld.</div>}
                      </div>

                      <SectionTitle title="Lid toevoegen" />
                      <label className="member-search">Zoeken<input type="search" placeholder="Zoek op naam of rugnummer" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} /></label>
                      <div className="available-member-list">
                        {availableProfiles.slice(0, 30).map(person => <article className="available-member-row" key={person.id}>
                          <span className="member-avatar small">{initials(person)}</span>
                          <div className="member-copy"><strong>{personName(person)}</strong><small>{person.jersey_number ? `#${person.jersey_number}` : 'Geen rugnummer'}</small></div>
                          <div className="add-member-actions"><button className="mini-action" disabled={busy} onClick={() => addMember(person.id, 'player')}>+ Speler</button><button className="mini-action coach" disabled={busy} onClick={() => addMember(person.id, 'coach')}>+ Coach</button></div>
                        </article>)}
                        {!availableProfiles.length && <div className="admin-empty">Geen beschikbare leden gevonden.</div>}
                      </div>
                    </>}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  )
}

function AdminMenuItem({ icon, title, subtitle, onClick }) {
  return <button className="admin-menu-item" onClick={onClick}><span className="admin-menu-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><Icon name="chevron" /></button>
}

function More({ session, profile, teams, calendar, onSaved, onMessage }) {
  const [icsUrl, setIcsUrl] = useState(calendar?.ics_url ?? '')
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => setIcsUrl(calendar?.ics_url ?? ''), [calendar])
  useEffect(() => { setFirstName(profile?.first_name ?? ''); setLastName(profile?.last_name ?? '') }, [profile])

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Naam nog niet ingesteld'
  const teamLine = teams[0]?.name ? `${teams[0].name}${profile?.jersey_number ? ` · #${profile.jersey_number}` : ''}` : (profile?.jersey_number ? `#${profile.jersey_number}` : 'Nog geen team gekoppeld')

  async function saveProfile() {
    setProfileBusy(true)
    onMessage('')
    const { error } = await supabase.from('profiles').update({ first_name: firstName.trim(), last_name: lastName.trim() }).eq('id', session.user.id)
    setProfileBusy(false)
    if (error) onMessage(`Profiel opslaan mislukt: ${error.message}`)
    else { onMessage('Profiel opgeslagen ✓'); setEditingName(false); onSaved() }
  }

  function cancelProfileEdit() {
    setFirstName(profile?.first_name ?? '')
    setLastName(profile?.last_name ?? '')
    setEditingName(false)
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
    else { onMessage('KNBSB-agenda gekoppeld ✓'); setShowCalendar(false); onSaved() }
  }

  async function removeCalendar() {
    if (!calendar) return
    setCalendarBusy(true)
    onMessage('')
    const { error } = await supabase.from('calendar_connections').delete().eq('id', calendar.id).eq('profile_id', session.user.id)
    setCalendarBusy(false)
    if (error) onMessage(`Koppeling verwijderen mislukt: ${error.message}`)
    else { setIcsUrl(''); setShowCalendar(false); onMessage('KNBSB-agenda ontkoppeld.'); onSaved() }
  }

  async function signOut() { await supabase.auth.signOut() }

  return (
    <section>
      <ScreenHeader title="Profiel" />

      <article className="profile-card">
        <span className="avatar"><Icon name="person" /></span>
        <div className="profile-copy"><h2>{displayName}</h2><p>{teamLine}</p></div>
        <button className="outline-action" onClick={() => setEditingName(true)}><Icon name="edit" /> Aanpassen</button>
      </article>

      {editingName && (
        <section className="edit-panel">
          <div className="edit-panel-head"><h2>Naam aanpassen</h2><button className="text-button" onClick={cancelProfileEdit}>Annuleren</button></div>
          <div className="form-stack">
            <label>Voornaam<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" /></label>
            <label>Achternaam<input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" /></label>
            <button className="primary" onClick={saveProfile} disabled={profileBusy}>{profileBusy ? 'Opslaan…' : 'Opslaan'}</button>
          </div>
        </section>
      )}

      <div className="settings-list">
        <SettingsRow icon="person" title="Persoonlijke gegevens" subtitle={session.user.email} />
        <SettingsRow icon="lock" title="Wachtwoord" subtitle="Reset via het inlogscherm" />
        <SettingsRow icon="bell" title="Notificaties" subtitle="Pushmeldingen komen later" disabled />
        <SettingsRow icon="link" title="Koppelingen" subtitle={calendar ? 'FOYS agenda gekoppeld' : 'FOYS agenda koppelen'} status={calendar ? 'Gekoppeld' : null} onClick={() => setShowCalendar(v => !v)} />
        <SettingsRow icon="info" title="Over Mijn OG" subtitle="Versie 2.3" />
      </div>

      {showCalendar && (
        <section className="edit-panel calendar-panel">
          <div className="edit-panel-head"><div><h2>KNBSB agenda</h2><p className="muted no-margin">Je persoonlijke FOYS-link is alleen voor jouw account.</p></div><button className="text-button" onClick={() => setShowCalendar(false)}>Sluiten</button></div>
          <div className="form-stack">
            <label>Persoonlijke ICS-link<textarea rows="4" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://api.foys.io/competition/public-api/v1/persons/.../ics" /></label>
            <button className="primary" onClick={saveCalendar} disabled={calendarBusy}>{calendarBusy ? 'Opslaan…' : calendar ? 'Koppeling bijwerken' : 'Agenda koppelen'}</button>
            {calendar && <button className="danger-link" onClick={removeCalendar} disabled={calendarBusy}>Koppeling verwijderen</button>}
          </div>
        </section>
      )}

      {profile?.role === 'admin' && <AdminPanel onMessage={onMessage} onChanged={onSaved} />}

      <button className="logout-button" onClick={signOut}><Icon name="logout" /> Uitloggen</button>
    </section>
  )
}

function SettingsRow({ icon, title, subtitle, status, onClick, disabled }) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component className={`settings-row${disabled ? ' disabled' : ''}`} onClick={onClick}>
      <span className="settings-icon"><Icon name={icon} /></span>
      <span className="settings-copy"><strong>{title}</strong><small>{subtitle}</small></span>
      {status && <span className="status-label">{status}</span>}
      {onClick && <Icon name="chevron" />}
    </Component>
  )
}

function SectionTitle({ title, action, onAction }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button onClick={onAction}>{action}</button>}</div>
}

function ScreenHeader({ title, action, onAction }) {
  return <div className="screen-header"><h1>{title}</h1>{action && <button onClick={onAction}>{action}</button>}</div>
}

function EmptyState({ icon, title, text, action, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} /></span>
      <div><h3>{title}</h3><p>{text}</p>{action && <button className="text-button" onClick={onAction}>{action}</button>}</div>
    </div>
  )
}

function Icon({ name }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    stats: <><path d="M5 20v-7M12 20V4M19 20v-11"/></>,
    team: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M15 15c3.5 0 6 1.6 6 5"/></>,
    more: <><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M12 13v4M8 21h8M9 17h6M8 6H4c0 4 2 6 5 6M16 6h4c0 4-2 6-5 6"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/></>,
    edit: <><path d="m4 20 4-.8L19 8.2 15.8 5 4.8 16Z"/><path d="m14.8 6 3.2 3.2"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    people: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c0-4 2.3-6 5.5-6s5.5 2 5.5 6M14 15c3.5 0 6 1.6 6 5"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.more}</svg>
}

function iconNameForTab(tab) {
  return { Home: 'home', Agenda: 'calendar', Stats: 'stats', Team: 'team', Meer: 'more' }[tab]
}

function translateRole(role) {
  return { player: 'speler', coach: 'coach', admin: 'beheerder' }[role] || role || 'lid'
}

function capitalize(value = '') { return value ? value.charAt(0).toUpperCase() + value.slice(1) : '' }


function personName(profile) {
  if (!profile) return 'Onbekend lid'
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Naam nog niet ingesteld'
}

function initials(profile) {
  const parts = [profile?.first_name, profile?.last_name].filter(Boolean)
  if (!parts.length) return 'OG'
  return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function formatSeasonRange(season) {
  if (!season?.starts_on && !season?.ends_on) return 'Geen datums ingesteld'
  const fmt = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '') : null
  if (season.starts_on && season.ends_on) return `${fmt(season.starts_on)} – ${fmt(season.ends_on)}`
  return fmt(season.starts_on || season.ends_on)
}

function formatLongDate(value) {
  return capitalize(new Date(value).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }))
}

function formatShortDate(value) {
  return capitalize(new Date(value).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', ''))
}

function formatTimeRange(start, end) {
  const startText = new Date(start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (!end) return startText
  const endText = new Date(end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  return `${startText} – ${endText}`
}

function groupByMonth(events) {
  return events.reduce((acc, event) => {
    const month = capitalize(new Date(event.start).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }))
    acc[month] ||= []
    acc[month].push(event)
    return acc
  }, {})
}
