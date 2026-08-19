'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { analyzeSwingVideo } from '../lib/swing-ai'

const allTabs = ['Home', 'Agenda', 'Stats', 'Coach', 'Team', 'Meer']

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
  const [trainingEvents, setTrainingEvents] = useState([])
  const [attendance, setAttendance] = useState([])
  const [visibleProfiles, setVisibleProfiles] = useState([])
  const [allMemberships, setAllMemberships] = useState([])
  const [eventTeamLinks, setEventTeamLinks] = useState([])
  const [eventParticipantLinks, setEventParticipantLinks] = useState([])
  const [calendarState, setCalendarState] = useState({ loading: false, error: '' })
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [inviteMode, setInviteMode] = useState(false)
  const [absenceEvent, setAbsenceEvent] = useState(null)
  const [absenceReason, setAbsenceReason] = useState('')
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [clubLocations, setClubLocations] = useState([])
  const [transportEvents, setTransportEvents] = useState([])
  const [transportResponses, setTransportResponses] = useState([])
  const [teamMessages, setTeamMessages] = useState([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [gameAttendance, setGameAttendance] = useState([])
  const [playerRequests, setPlayerRequests] = useState([])
  const [playerRequestCandidates, setPlayerRequestCandidates] = useState([])
  const [pushSubscriptions, setPushSubscriptions] = useState([])
  const [playerGameStats, setPlayerGameStats] = useState([])
  const [playerMeasurements, setPlayerMeasurements] = useState([])
  const [gameHighlights, setGameHighlights] = useState([])
  const [swingAccess, setSwingAccess] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setInviteMode(params.get('invite') === '1')
      const requestedTab = params.get('tab')
      if (requestedTab && allTabs.includes(requestedTab)) setActiveTab(requestedTab)
    }
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
      setProfile(null); setTeams([]); setCalendarConnection(null); setCalendarEvents([]); setTrainingEvents([]); setAttendance([]); setVisibleProfiles([]); setAllMemberships([]); setEventTeamLinks([]); setEventParticipantLinks([]); setClubLocations([]); setTransportEvents([]); setTransportResponses([]); setTeamMessages([]); setGameAttendance([]); setPlayerRequests([]); setPlayerRequestCandidates([]); setPushSubscriptions([]); setPlayerGameStats([]); setPlayerMeasurements([]); setGameHighlights([]); setSwingAccess(null)
      return
    }
    loadUserData(session.user.id, session.access_token)
  }, [session?.user?.id])

  async function loadUserData(userId, accessToken = session?.access_token) {
    setLoading(true)
    setMessage('')
    const [profileResult, teamResult, calendarResult, eventResult, attendanceResult, profilesResult, membershipResult, eventTeamsResult, eventParticipantsResult, locationsResult, transportEventsResult, transportResponsesResult, messagesResult, gameAttendanceResult, playerRequestsResult, playerCandidatesResult, pushSubscriptionsResult, playerGameStatsResult, playerMeasurementsResult, gameHighlightsResult, swingAccessResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('team_members').select('member_role, teams(id, name, sport, season_id, is_active, team_photo_url, foys_match_text, seasons(is_active))').eq('profile_id', userId),
      supabase.from('calendar_connections').select('*').eq('profile_id', userId).eq('provider', 'foys').maybeSingle(),
      supabase.from('events').select('*').order('start_at', { ascending: true }),
      supabase.from('attendance').select('*'),
      supabase.from('profiles').select('id, first_name, last_name, jersey_number, role, avatar_url, primary_position, secondary_positions, throws_hand, bats_side, is_placeholder'),
      supabase.from('team_members').select('id,team_id,profile_id,member_role'),
      supabase.from('event_teams').select('event_id,team_id,teams(id,name,sport)'),
      supabase.from('event_participants').select('event_id,profile_id'),
      supabase.from('club_locations').select('*').eq('is_active', true).order('name'),
      supabase.from('transport_events').select('*'),
      supabase.from('transport_responses').select('*'),
      supabase.from('team_messages').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('game_attendance').select('*'),
      supabase.from('player_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('player_request_candidates').select('*'),
      supabase.from('push_subscriptions').select('profile_id,enabled').eq('enabled', true),
      supabase.from('player_game_stats').select('*').order('game_date', { ascending: true }),
      supabase.from('player_measurements').select('*').order('measured_at', { ascending: true }),
      supabase.from('game_highlights').select('*').order('updated_at', { ascending: false }),
      supabase.from('swing_analyzer_permissions').select('access_level').eq('profile_id', userId).maybeSingle()
    ])
    if (profileResult.error) setMessage(`Profiel kon niet worden geladen: ${profileResult.error.message}`)
    else setProfile(profileResult.data)
    if (teamResult.error) setMessage(`Teamgegevens konden niet worden geladen: ${teamResult.error.message}`)
    else setTeams((teamResult.data ?? []).filter(row => row.teams && row.teams.is_active !== false && row.teams.seasons?.is_active !== false).map(row => ({ ...row.teams, member_role: row.member_role })))
    if (calendarResult.error) { setMessage(`Agendakoppeling kon niet worden geladen: ${calendarResult.error.message}`); setCalendarConnection(null) }
    else {
      setCalendarConnection(calendarResult.data)
      if (calendarResult.data?.is_active && accessToken) await loadCalendar(accessToken)
      else setCalendarEvents([])
    }
    if (eventResult.error) setMessage(`Trainingen konden niet worden geladen: ${eventResult.error.message}`)
    else {
      const teamLinks = eventTeamsResult.data ?? []
      const participantLinks = eventParticipantsResult.data ?? []
      setEventTeamLinks(teamLinks)
      setEventParticipantLinks(participantLinks)
      setTrainingEvents((eventResult.data ?? []).map(row => normalizeTrainingEvent(row, teamLinks, participantLinks)))
    }
    if (!attendanceResult.error) setAttendance(attendanceResult.data ?? [])
    if (!profilesResult.error) setVisibleProfiles(profilesResult.data ?? [])
    if (!membershipResult.error) setAllMemberships(membershipResult.data ?? [])
    if (!locationsResult.error) setClubLocations(locationsResult.data ?? [])
    if (!transportEventsResult.error) setTransportEvents(transportEventsResult.data ?? [])
    if (!transportResponsesResult.error) setTransportResponses(transportResponsesResult.data ?? [])
    if (!messagesResult.error) setTeamMessages(messagesResult.data ?? [])
    if (!gameAttendanceResult.error) setGameAttendance(gameAttendanceResult.data ?? [])
    if (!playerRequestsResult.error) setPlayerRequests(playerRequestsResult.data ?? [])
    if (!playerCandidatesResult.error) setPlayerRequestCandidates(playerCandidatesResult.data ?? [])
    if (!pushSubscriptionsResult.error) setPushSubscriptions(pushSubscriptionsResult.data ?? [])
    if (!playerGameStatsResult.error) setPlayerGameStats(playerGameStatsResult.data ?? [])
    if (!playerMeasurementsResult.error) setPlayerMeasurements(playerMeasurementsResult.data ?? [])
    if (!gameHighlightsResult.error) setGameHighlights(gameHighlightsResult.data ?? [])
    setSwingAccess(profileResult.data?.role === 'admin' ? 'admin' : (swingAccessResult.error ? null : swingAccessResult.data?.access_level || null))
    setLoading(false)
  }

  async function refreshAppData() {
    if (session?.user?.id) await loadUserData(session.user.id, session.access_token)
  }

  function navigate(tab) {
    setActiveTab(tab)
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }))
  }

  async function loadCalendar(accessToken = session?.access_token) {
    if (!accessToken) return
    setCalendarState({ loading: true, error: '' })
    try {
      const response = await fetch('/api/calendar', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Agenda kon niet worden geladen.')
      setCalendarEvents((payload.events ?? []).map(event => ({ ...event, type: 'game', source: 'foys' })))
      setCalendarState({ loading: false, error: '' })
    } catch (error) {
      setCalendarEvents([])
      setCalendarState({ loading: false, error: error.message })
    }
  }

  const allEvents = useMemo(() => [...calendarEvents, ...trainingEvents].filter(event => new Date(event.start).getTime() >= Date.now() - 86400000).sort((a,b) => new Date(a.start)-new Date(b.start)), [calendarEvents, trainingEvents])
  const ownAttendance = useMemo(() => Object.fromEntries(attendance.filter(row => row.profile_id === session?.user?.id).map(row => [String(row.event_id), row])), [attendance, session?.user?.id])

  async function setAttendanceStatus(event, status) {
    if (status === 'absent') { setAbsenceReason(''); setAbsenceEvent(event); return }
    setAttendanceBusy(true); setMessage('')
    const { error } = await supabase.from('attendance').upsert({ event_id: event.id, profile_id: session.user.id, status, note: null, updated_at: new Date().toISOString() }, { onConflict: 'event_id,profile_id' })
    setAttendanceBusy(false)
    if (error) setMessage(`Aanwezigheid opslaan mislukt: ${error.message}`)
    else await refreshAppData()
  }

  async function confirmAbsence() {
    if (!absenceReason.trim()) return setMessage('Geef een reden voor je afmelding.')
    setAttendanceBusy(true); setMessage('')
    const { error } = await supabase.from('attendance').upsert({ event_id: absenceEvent.id, profile_id: session.user.id, status: 'absent', note: absenceReason.trim(), updated_at: new Date().toISOString() }, { onConflict: 'event_id,profile_id' })
    setAttendanceBusy(false)
    if (error) setMessage(`Afmelden mislukt: ${error.message}`)
    else { setAbsenceEvent(null); setAbsenceReason(''); await refreshAppData() }
  }

  if (!authReady) return <main className="center"><div className="loader">Mijn OG laden…</div></main>
  if (recoveryMode) return <PasswordRecovery onDone={() => setRecoveryMode(false)} />
  if (inviteMode && session) return <InviteSetup onDone={() => { if (typeof window !== 'undefined') window.history.replaceState({}, '', window.location.pathname); setInviteMode(false) }} />
  if (!session) return <Login onMessage={setMessage} message={message} />

  const isCoachUser = profile?.role === 'admin' || teams.some(team => team.member_role === 'coach')
  const navTabs = isCoachUser ? ['Home', 'Agenda', 'Coach', 'Team', 'Meer'] : ['Home', 'Agenda', 'Stats', 'Team', 'Meer']

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><img className="brand-logo" src="/og-logo.png" alt="Onze Gezellen" /><span className="brand-name">Mijn OG</span></div>
        <button className="icon-button notification-bell" aria-label="Meldingen" title="Meldingen" onClick={() => setNotificationsOpen(true)}><Icon name="bell" />{teamMessages.length>0 && <span className="bell-dot" />}</button>
      </header>
      <section className="content">
        {message && <div className="notice">{message}</div>}
        {loading && <div className="subtle-loading">Gegevens bijwerken…</div>}
        {activeTab === 'Home' && <Dashboard session={session} profile={profile} teams={teams} events={allEvents} messages={teamMessages} playerRequests={playerRequests} playerCandidates={playerRequestCandidates} pushSubscriptions={pushSubscriptions} onRefresh={refreshAppData} transportEvents={transportEvents} transportResponses={transportResponses} calendarConnection={calendarConnection} calendarState={calendarState} ownAttendance={ownAttendance} onAttendance={setAttendanceStatus} attendanceBusy={attendanceBusy} onAgenda={() => navigate('Agenda')} onTeam={() => navigate('Team')} onStats={() => navigate('Stats')} onMore={() => navigate('Meer')} />}
        {activeTab === 'Agenda' && <Agenda events={allEvents} connection={calendarConnection} gameHighlights={gameHighlights} gameStats={playerGameStats} transportEvents={transportEvents} transportResponses={transportResponses} clubLocations={clubLocations} state={calendarState} profile={profile} teams={teams} attendance={attendance} visibleProfiles={visibleProfiles} memberships={allMemberships} ownAttendance={ownAttendance} onAttendance={setAttendanceStatus} attendanceBusy={attendanceBusy} onRefresh={refreshAppData} onGoMore={() => navigate('Meer')} />}
        {activeTab === 'Stats' && <Stats profile={profile} teams={teams} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} gameStats={playerGameStats} measurements={playerMeasurements} />}
        {activeTab === 'Coach' && isCoachUser && <CoachDashboard session={session} profile={profile} teams={teams} gameStats={playerGameStats} measurements={playerMeasurements} trainingEvents={trainingEvents} calendarEvents={calendarEvents} attendance={attendance} gameAttendance={gameAttendance} profiles={visibleProfiles} memberships={allMemberships} messages={teamMessages} playerRequests={playerRequests} playerCandidates={playerRequestCandidates} pushSubscriptions={pushSubscriptions} ownAttendance={ownAttendance} onAttendance={setAttendanceStatus} attendanceBusy={attendanceBusy} clubLocations={clubLocations} transportEvents={transportEvents} transportResponses={transportResponses} onRefresh={refreshAppData} onMessage={setMessage} swingAccess={swingAccess} />}
        {activeTab === 'Team' && <Team session={session} profile={profile} teams={teams} profiles={visibleProfiles} memberships={allMemberships} gameStats={playerGameStats} measurements={playerMeasurements} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} onSaved={refreshAppData} onMessage={setMessage} />}
        {activeTab === 'Meer' && <More session={session} profile={profile} teams={teams} calendar={calendarConnection} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} memberships={allMemberships} onSaved={refreshAppData} onMessage={setMessage} />}
      </section>
      <nav className="bottom-nav" aria-label="Hoofdnavigatie">{navTabs.map(tab => <button key={tab} className={activeTab === tab ? 'nav-item active' : 'nav-item'} onClick={() => navigate(tab)}><Icon name={iconNameForTab(tab)} /><small>{tab}</small></button>)}</nav>
      {notificationsOpen && <NotificationInbox messages={teamMessages} teams={teams} onClose={() => setNotificationsOpen(false)} />}
      {absenceEvent && <AbsenceModal event={absenceEvent} reason={absenceReason} setReason={setAbsenceReason} busy={attendanceBusy} onCancel={() => { setAbsenceEvent(null); setAbsenceReason(''); setMessage('') }} onConfirm={confirmAbsence} />}
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
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mijn-og-v2.vercel.app'}/`
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


function InviteSetup({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  async function finishInvite(e) {
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
        <div className="login-brand"><img src="/og-logo.png" className="login-logo" alt="Onze Gezellen" /><div><p className="eyebrow orange">WELKOM BIJ MIJN OG</p><h1>Activeer je account</h1><p className="muted no-margin">Kies een wachtwoord om je uitnodiging af te ronden.</p></div></div>
        <div className="login-card">
          {saved ? <><div className="notice success">Je account is klaar ✓</div><button className="primary" onClick={onDone}>Naar Mijn OG</button></> : (
            <form onSubmit={finishInvite} className="form-stack">
              <label>Wachtwoord<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required /></label>
              <label>Herhaal wachtwoord<input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></label>
              <button className="primary" disabled={busy}>{busy ? 'Account activeren…' : 'Account activeren'}</button>
              {message && <div className="notice error">{message}</div>}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}


function Dashboard({ session, profile, teams, events, messages = [], playerRequests = [], playerCandidates = [], onRefresh, transportEvents, transportResponses, calendarConnection, calendarState, ownAttendance, onAttendance, attendanceBusy, onAgenda, onTeam, onStats, onMore }) {
  const firstName = profile?.first_name?.trim() || ''
  const nextEvent = events[0] || null
  const upcoming = events.slice(0, 3)
  return <>
    <section className="home-intro centered-copy"><h1>{firstName ? `Hoi ${firstName}!` : 'Welkom bij Mijn OG'}</h1><p className="muted no-margin">Alles wat voor jou en je team belangrijk is, op één plek.</p></section>
    <PlayerInvitationCards session={session} requests={playerRequests} candidates={playerCandidates} teams={teams} onRefresh={onRefresh} />
    <section className={`hero-event ${nextEvent?.type === 'training' ? 'training-hero' : ''}`}>
      <div className="hero-ball" aria-hidden="true" />
      <div className="hero-topline"><span>VOLGENDE ACTIVITEIT</span>{nextEvent && <span className="hero-badge">{eventTypeLabel(nextEvent)}</span>}</div>
      {calendarState.loading && !nextEvent ? <div className="hero-empty">Agenda laden…</div> : nextEvent ? <>
        <h2>{nextEvent.title}</h2>
        <div className="hero-meta"><Icon name="calendar" /><span>{formatLongDate(nextEvent.start)}</span></div>
        <div className="hero-meta"><Icon name="clock" /><span>{formatTimeRange(nextEvent.start, nextEvent.end)}</span></div>
        {nextEvent.meetAt && <div className="hero-meta"><Icon name="people" /><span>Verzamelen {formatClock(nextEvent.meetAt)}</span></div>}
        {nextEvent.location && <div className="hero-meta"><Icon name="pin" /><span>{nextEvent.location}</span></div>}
        {nextEvent.type === 'training' && <AttendanceButtons current={ownAttendance[String(nextEvent.id)]?.status} onSelect={status => onAttendance(nextEvent, status)} busy={attendanceBusy} compact />}
        <button className="hero-action" onClick={onAgenda}>Bekijk details <Icon name="arrow" /></button>
      </> : calendarConnection ? <div className="hero-empty"><strong>Geen komende activiteiten.</strong><span>Nieuwe wedstrijden en trainingen verschijnen hier automatisch.</span><button className="hero-action" onClick={onAgenda}>Bekijk agenda <Icon name="arrow" /></button></div> : <div className="hero-empty"><strong>Koppel je KNBSB-agenda.</strong><span>Voeg je persoonlijke FOYS-link toe om wedstrijden te zien.</span><button className="hero-action" onClick={onMore}>Agenda koppelen <Icon name="arrow" /></button></div>}
    </section>
    <SectionTitle title="Komende activiteiten" action="Alles bekijken" onAction={onAgenda} />
    <section className="activity-card">{upcoming.length ? upcoming.map(event => <CompactEvent key={event.uid || `${event.type}-${event.id}`} event={event} transportEvent={findTransportEvent(event, transportEvents)} responses={transportResponses} />) : <EmptyState icon="calendar" title="Geen activiteiten gevonden" text="Trainingen en wedstrijden verschijnen hier zodra ze beschikbaar zijn." />}</section>
    <SectionTitle title={teams.length > 1 ? "Mijn teams" : "Mijn team"} />
    {teams.length ? <div className="home-team-list">{teams.map(team => <button className="team-link-card" key={team.id} onClick={onTeam}><TeamThumb team={team} /><span className="team-link-copy"><strong>{team.name}</strong><small>{capitalize(team.sport)} · {translateRole(team.member_role)}</small></span><Icon name="chevron" /></button>)}</div> : <EmptyState icon="team" title="Nog geen team gekoppeld" text="Een beheerder kan jouw account aan het juiste team koppelen." />}
    <SectionTitle title="Teamberichten" />
    <section className="team-news-home">{messages.length ? messages.slice(0,3).map(msg => <article key={msg.id}><span className="news-icon"><Icon name={messageIcon(msg.kind)} /></span><div><strong>{msg.title}</strong><p>{msg.body}</p><small>{formatMessageDate(msg.created_at)}</small></div></article>) : <p className="muted">Nog geen teamberichten.</p>}</section>
    <SectionTitle title="Mijn stats" action="Bekijk stats" onAction={onStats} /><section className="stats-placeholder"><div><span className="stats-eyebrow">PERSOONLIJK</span><h3>Nog geen statistieken beschikbaar</h3><p>Zodra we een echte statsbron koppelen, verschijnen je prestaties hier automatisch.</p></div><Icon name="stats" /></section>
    <SectionTitle title="Clubnieuws & highlights" /><EmptyState icon="trophy" title="Nog geen clubhighlight geplaatst" text="Clubbrede highlights verschijnen hier zodra er echte content is toegevoegd." />
  </>
}

function CompactEvent({ event, transportEvent, responses = [] }) {
  const date = new Date(event.start)
  const summary = event.type === 'game' && transportEvent ? getTransportSummary(transportEvent, responses) : null
  return <article className="compact-event"><div className="compact-date"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('nl-NL', { month: 'short' }).replace('.', '').toUpperCase()}</span></div><div className="compact-event-copy"><strong>{event.title}</strong><span>{formatShortDate(event.start)}</span><small>{formatTimeRange(event.start,event.end)}{event.location ? ` · ${event.location}` : ''}</small>{summary && <small className={summary.shortage > 0 ? 'transport-shortage-text' : 'transport-ok-text'}>{summary.shortage > 0 ? `${summary.shortage} PLEKKEN NODIG` : 'VERVOER GEREGELD'}</small>}</div><span className={`type-chip ${event.type === 'training' ? 'training-chip' : ''}`}>{eventTypeLabel(event)}</span></article>
}

function Agenda({ events, connection, gameHighlights = [], gameStats = [], state, profile, teams, attendance, visibleProfiles, memberships, ownAttendance, onAttendance, attendanceBusy, onRefresh, onGoMore, transportEvents, transportResponses, clubLocations }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [detailEvent, setDetailEvent] = useState(null)
  const [timeView, setTimeView] = useState('upcoming')
  const coachTeamIds = new Set(teams.filter(team => team.member_role === 'coach').map(team => Number(team.id)))

  const matchedEvents = useMemo(() => events.map(event => ({ ...event, matchedTeamIds: eventTeamMatches(event, teams) })), [events, teams])
  const filtered = matchedEvents.filter(event => {
    const typeOk = typeFilter === 'all' || (typeFilter === 'games' ? event.type === 'game' : event.type === 'training')
    const teamOk = teamFilter === 'all' || event.matchedTeamIds.includes(Number(teamFilter))
    const isPast = new Date(event.end || event.start).getTime() < Date.now()
    const timeOk = timeView === 'played' ? isPast : !isPast
    return typeOk && teamOk && timeOk
  })
  const grouped = useMemo(() => groupByMonth(filtered), [filtered])

  function canManage(event) {
    return event.type === 'training' && (profile?.role === 'admin' || (event.teamIds ?? [event.teamId]).some(id => coachTeamIds.has(Number(id))))
  }

  return <section className="agenda-page">
    <ScreenHeader title="Agenda" action={connection ? 'Vernieuwen' : null} onAction={connection ? onRefresh : undefined} />

    <div className="agenda-time-tabs"><button className={timeView==='upcoming'?'active':''} onClick={()=>setTimeView('upcoming')}>Komend</button><button className={timeView==='played'?'active':''} onClick={()=>setTimeView('played')}>Gespeeld</button></div>

    {teams.length > 1 && <div className="agenda-filter-block"><span className="agenda-filter-label">Team</span><div className="filter-row agenda-team-filters"><button className={`filter-chip ${teamFilter==='all'?'active':''}`} onClick={() => setTeamFilter('all')}>Alles</button>{teams.map(team => <button key={team.id} className={`filter-chip ${String(teamFilter)===String(team.id)?'active':''}`} onClick={() => setTeamFilter(String(team.id))}>{shortTeamLabel(team)}</button>)}</div></div>}

    <div className="agenda-filter-block"><span className="agenda-filter-label">Type</span><div className="filter-row centered-filters"><button className={`filter-chip ${typeFilter==='all'?'active':''}`} onClick={() => setTypeFilter('all')}>Alles</button><button className={`filter-chip ${typeFilter==='games'?'active':''}`} onClick={() => setTypeFilter('games')}>Wedstrijden</button><button className={`filter-chip ${typeFilter==='training'?'active':''}`} onClick={() => setTypeFilter('training')}>Trainingen</button></div></div>

    {!connection && events.every(event => event.type !== 'training') ? <EmptyState icon="link" title="KNBSB-agenda koppelen" text="Voeg onder Meer je persoonlijke FOYS ICS-link toe." action="Naar koppelingen" onAction={onGoMore} /> : state.loading && events.length===0 ? <EmptyState icon="calendar" title="Activiteiten laden…" text="We halen je programma op." /> : filtered.length===0 ? <EmptyState icon="calendar" title="Geen activiteiten gevonden" text={teamFilter !== 'all' ? 'Geen activiteiten gevonden voor dit team. Controleer eventueel de FOYS-herkenning bij Clubbeheer → Teams.' : 'Er zijn binnen dit filter geen komende activiteiten.'} /> : <div className="agenda-card-list">{Object.entries(grouped).map(([month, monthEvents]) => <section key={month} className="agenda-month"><h2>{month}</h2><div className="agenda-month-cards">{monthEvents.map(event => <AgendaEventCard key={event.uid || `${event.type}-${event.id}`} event={event} current={ownAttendance[String(event.id)]} onAttendance={onAttendance} busy={attendanceBusy} canManage={canManage(event)} onEdit={() => { setEditingEvent(event); setEditorOpen(true) }} onDetails={() => setDetailEvent(event)} attendance={attendance.filter(row => String(row.event_id)===String(event.id))} transportEvent={findTransportEvent(event, transportEvents)} transportResponses={transportResponses} highlight={gameHighlights.find(h=>h.game_key===eventTransportKey(event))} hasStats={gameStats.some(s=>s.game_key===eventTransportKey(event))} played={timeView==='played'} />)}</div></section>)}</div>}

    {editorOpen && <TrainingEditor profile={profile} teams={teams} profiles={visibleProfiles} memberships={memberships} event={editingEvent} onClose={() => { setEditorOpen(false); setEditingEvent(null) }} onSaved={async () => { setEditorOpen(false); setEditingEvent(null); await onRefresh() }} />}
    {detailEvent?.type === 'training' && <TrainingDetailModal event={detailEvent} current={ownAttendance[String(detailEvent.id)]} onAttendance={onAttendance} busy={attendanceBusy} canManage={canManage(detailEvent)} onEdit={() => { setDetailEvent(null); setEditingEvent(detailEvent); setEditorOpen(true) }} onClose={() => setDetailEvent(null)} attendance={attendance.filter(row => String(row.event_id)===String(detailEvent.id))} profiles={visibleProfiles} memberships={memberships} />}
    {detailEvent && detailEvent.type !== 'training' && <ActivityDetailModal event={detailEvent} profile={profile} teams={teams} profiles={visibleProfiles} memberships={memberships} clubLocations={clubLocations} transportEvent={findTransportEvent(detailEvent, transportEvents)} transportResponses={transportResponses} highlight={gameHighlights.find(h=>h.game_key===eventTransportKey(detailEvent))} gameStats={gameStats.filter(s=>s.game_key===eventTransportKey(detailEvent))} onChanged={onRefresh} onClose={() => setDetailEvent(null)} />}
  </section>
}

function AgendaEventCard({ event, current, onAttendance, busy, canManage, onEdit, onDetails, attendance, transportEvent, transportResponses, highlight, hasStats=false, played=false }) {
  const date = new Date(event.start)
  const transport = event.type === 'game' && transportEvent ? getTransportSummary(transportEvent, transportResponses) : null
  const coachSummary = event.type === 'training' && canManage ? attendanceCoachSummary(attendance, event) : ''
  return <article className={`agenda-event-card ${event.type}`}>
    <div className="agenda-date-block"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('nl-NL',{month:'short'}).replace('.','').toUpperCase()}</span></div>
    <div className="agenda-card-main">
      <span className="agenda-type-label">{eventTypeLabel(event).toUpperCase()}</span>
      <h3>{event.title}</h3>
      <div className="agenda-meta"><span><Icon name="clock" />{formatTimeRange(event.start,event.end)}</span>{event.location && <span><Icon name="pin" />{event.location}</span>}{event.meetAt && <span><Icon name="people" />Verzamelen {formatClock(event.meetAt)}</span>}</div>
      {event.type === 'training' && <EventAudience event={event} compact />}
      {event.type === 'training' && <div className="agenda-personal-status"><span>{attendanceStatusLabel(current?.status)}</span><button type="button" onClick={onDetails}>Details</button></div>}
      {event.type === 'game' && <div className="agenda-personal-status"><span>{played ? [highlight?.score_text, highlight?'Highlight ✓':null, hasStats?'Stats ✓':null].filter(Boolean).join(' · ') || 'Gespeelde wedstrijd' : transport ? (transport.shortage > 0 ? `${transport.shortage} plekken nodig` : 'Vervoer geregeld') : 'Wedstrijddetails'}</span><button type="button" onClick={onDetails}>Details</button></div>}
      {coachSummary && <small className="agenda-coach-summary">{coachSummary}</small>}
      {canManage && <button className="agenda-manage-link" type="button" onClick={onEdit}>Training beheren</button>}
    </div>
    <button className="agenda-card-chevron" type="button" aria-label="Details openen" onClick={onDetails}><Icon name="chevron" /></button>
  </article>
}

function attendanceStatusLabel(status) {
  if (status === 'present') return 'Aanwezig'
  if (status === 'maybe') return 'Misschien'
  if (status === 'absent') return 'Afwezig'
  if (status === 'injured') return 'Geblesseerd'
  if (status === 'late') return 'Te laat'
  return 'Nog reageren'
}

function attendanceCoachSummary(rows = [], event) {
  const counts = { present:0, absent:0, injured:0, late:0, maybe:0 }
  rows.forEach(row => { if (counts[row.status] !== undefined) counts[row.status] += 1 })
  const parts = []
  if (counts.present) parts.push(`${counts.present} aanwezig`)
  if (counts.absent) parts.push(`${counts.absent} afwezig`)
  if (counts.injured) parts.push(`${counts.injured} geblesseerd`)
  if (counts.late) parts.push(`${counts.late} te laat`)
  if (counts.maybe) parts.push(`${counts.maybe} misschien`)
  return parts.join(' · ')
}

function eventTeamMatches(event, teams = []) {
  if (event.type === 'training') {
    const ids = (event.teamIds?.length ? event.teamIds : event.teamId ? [event.teamId] : []).map(Number)
    return teams.filter(team => ids.includes(Number(team.id))).map(team => Number(team.id))
  }
  const haystack = normalizeMatchText([event.title, event.description, event.location].filter(Boolean).join(' | '))
  return teams.filter(team => {
    const configured = String(team.foys_match_text || '').split(/[,;|\n]+/).map(value => normalizeMatchText(value)).filter(Boolean)
    const aliases = configured.length ? configured : [normalizeMatchText(team.name)].filter(Boolean)
    return aliases.some(alias => alias && haystack.includes(alias))
  }).map(team => Number(team.id))
}

function normalizeMatchText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
}

function shortTeamLabel(team) {
  const alias = String(team.foys_match_text || '').split(/[,;|\n]+/).map(v => v.trim()).filter(Boolean)[0]
  return alias || team.name
}


function ActivityDetailModal({ event, profile, teams, profiles, memberships, clubLocations, transportEvent, transportResponses, highlight, gameStats = [], onChanged, onManageAttendance, onClose }) {
  const [transportOpen, setTransportOpen] = useState(false)
  const [highlightOpen,setHighlightOpen]=useState(false)
  const [statsOpen,setStatsOpen]=useState(false)
  const isPast=new Date(event.end||event.start).getTime()<Date.now()
  const matchedIds=eventTeamMatches(event,teams)
  const managedTeam=teams.find(t=>matchedIds.includes(Number(t.id)) && (t.member_role==='coach'||profile?.role==='admin'))
  const canPost=!!managedTeam || profile?.role==='admin'
  const ownStat=gameStats.find(s=>s.profile_id===profile?.id)
  return <div className="modal-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) onClose() }}><section className="detail-modal" role="dialog" aria-modal="true"><header className="detail-modal-header"><div><p className="eyebrow orange">{eventTypeLabel(event).toUpperCase()}</p><h2>{event.title}</h2></div><button className="sheet-icon-button" onClick={onClose}><Icon name="close"/></button></header><div className="detail-modal-body"><div className="detail-meta-grid"><div><Icon name="calendar"/><span>{formatLongDate(event.start)}</span></div><div><Icon name="clock"/><span>{formatTimeRange(event.start,event.end)}</span></div>{event.location && <div><Icon name="pin"/><span>{event.location}</span></div>}</div>
    {isPast && event.type==='game' && <section className="played-game-block"><p className="eyebrow orange">WEDSTRIJDARCHIEF</p>{highlight ? <><div className="played-score">{highlight.score_text||'Gespeeld'}</div><h3>{highlight.title||'Highlight'}</h3><p>{highlight.body}</p></> : <p className="muted">Er is nog geen highlight geschreven.</p>}{ownStat && <div className="own-game-stat"><strong>Jouw stats</strong><span>{ownStat.h||0} H · {ownStat.rbi||0} RBI · {ownStat.sb||0} SB</span></div>}<div className="played-actions">{canPost&&<button className="secondary orange-outline" onClick={()=>setHighlightOpen(true)}>{highlight?'Highlight aanpassen':'Highlight schrijven'}</button>}{canPost&&<button className="primary" onClick={()=>setStatsOpen(true)}>Stats invoeren</button>}</div></section>}
    {event.location && !isPast && <LocationTravelCard location={null} fallbackDestination={event.location} />}{event.description && <p className="detail-description">{event.description}</p>}{onManageAttendance && <button className="secondary orange-outline coach-attendance-manage" onClick={onManageAttendance}>Aanwezigheid beheren</button>}{!isPast&&<button className="transport-open-button" onClick={() => setTransportOpen(true)}><Icon name="car"/><span><strong>Vervoer</strong><small>{transportEvent ? transportStatusLabel(transportEvent, transportResponses) : 'Bekijk wie rijdt en wie mee moet'}</small></span><Icon name="chevron"/></button>}</div></section>
    {transportOpen && <TransportModal event={event} profile={profile} teams={teams} profiles={profiles} memberships={memberships} transportEvent={transportEvent} responses={transportResponses} onChanged={onChanged} onClose={() => setTransportOpen(false)} />}
    {highlightOpen&&<GameHighlightModal event={event} team={managedTeam} highlight={highlight} onClose={()=>setHighlightOpen(false)} onSaved={async()=>{setHighlightOpen(false);await onChanged()}}/>}
    {statsOpen&&<GameStatsEntryModal event={event} team={managedTeam} profiles={profiles} memberships={memberships} onClose={()=>setStatsOpen(false)} onSaved={async()=>{setStatsOpen(false);await onChanged()}}/>}
  </div>
}

function GameHighlightModal({event,team,highlight,onClose,onSaved}){
  const [form,setForm]=useState({score_text:highlight?.score_text||'',title:highlight?.title||'',body:highlight?.body||''})
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('')
  async function save(){
    if(!form.body.trim())return setFeedback('Schrijf eerst een korte highlight.')
    setBusy(true);setFeedback('')
    const payload={game_key:eventTransportKey(event),team_id:Number(team?.id)||null,game_date:toDateInput(event.start),score_text:form.score_text.trim()||null,title:form.title.trim()||null,body:form.body.trim(),updated_at:new Date().toISOString()}
    const {error}=await supabase.from('game_highlights').upsert(payload,{onConflict:'game_key'})
    setBusy(false);if(error)return setFeedback(error.message);await onSaved()
  }
  return <SettingsModal title="Wedstrijdhighlight" onClose={onClose}><div className="form-stack"><label>Uitslag<input value={form.score_text} onChange={e=>setForm({...form,score_text:e.target.value})} placeholder="Bijv. 8 - 4"/></label><label>Titel<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Sterke comeback in de 6e inning"/></label><label>Highlight<textarea rows="5" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Schrijf een korte samenvatting van de wedstrijd…"/></label>{feedback&&<div className="push-feedback">{feedback}</div>}<button className="primary" disabled={busy} onClick={save}>{busy?'Opslaan…':'Highlight opslaan'}</button></div></SettingsModal>
}
function GameStatsEntryModal({event,team,profiles=[],memberships=[],onClose,onSaved}){
  const players=memberships.filter(m=>Number(m.team_id)===Number(team?.id)&&m.member_role==='player').map(m=>profiles.find(p=>p.id===m.profile_id)).filter(Boolean).sort((a,b)=>(Number(a.jersey_number)||999)-(Number(b.jersey_number)||999))
  const [rows,setRows]=useState(()=>Object.fromEntries(players.map(p=>[p.id,{ab:'',h:'',rbi:'',bb:'',hbp:'',sf:'',tb:'',sb:''}])))
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('')
  function change(id,k,v){setRows(cur=>({...cur,[id]:{...cur[id],[k]:v}}))}
  async function save(){
    setBusy(true);setFeedback('')
    const game_key=eventTransportKey(event), game_date=toDateInput(event.start)
    const payloads=players.filter(p=>Object.values(rows[p.id]||{}).some(v=>v!=='')).map(p=>{const r=rows[p.id];const x={profile_id:p.id,team_id:Number(team.id),game_key,game_date,opponent:event.title,source:'manual'};['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>x[k]=Number(r[k]||0));return x})
    if(!payloads.length){setBusy(false);return setFeedback('Vul minimaal één speelster in.')}
    const {error}=await supabase.from('player_game_stats').upsert(payloads,{onConflict:'profile_id,game_key'})
    setBusy(false);if(error)return setFeedback(error.message);await onSaved()
  }
  return <SettingsModal title="Wedstrijdstats invoeren" onClose={onClose}><div className="game-stats-entry"><p className="muted">Vul alleen speelsters in die hebben meegedaan. AVG en OPS worden automatisch berekend.</p>{players.map(p=><section className="game-stat-player" key={p.id}><strong>{teamDisplayName(p)}{p.jersey_number?` · #${p.jersey_number}`:''}</strong><div className="stat-entry-grid">{['ab','h','rbi','bb','hbp','sf','tb','sb'].map(k=><label key={k}>{k.toUpperCase()}<input type="number" min="0" value={rows[p.id]?.[k]||''} onChange={e=>change(p.id,k,e.target.value)}/></label>)}</div></section>)}{feedback&&<div className="push-feedback">{feedback}</div>}<button className="primary" disabled={busy} onClick={save}>{busy?'Opslaan…':'Alle stats opslaan'}</button></div></SettingsModal>
}

function EventAudience({ event, compact=false }) {
  const teams = event.teams ?? []
  const guestCount = event.guestProfileIds?.length ?? 0
  if (!teams.length && !guestCount) return null
  return <div className={`event-audience ${compact ? 'compact' : ''}`}>{teams.map(team => <span key={team.id}>{team.name}</span>)}{guestCount > 0 && <span>+ {guestCount} gast{guestCount === 1 ? '' : 'en'}</span>}</div>
}

function TrainingDetailModal({ event, current, onAttendance, busy, canManage, onEdit, onManageAttendance, onClose, attendance, profiles, memberships }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target===e.currentTarget) onClose() }}><section className="detail-modal" role="dialog" aria-modal="true" aria-label="Trainingdetails"><header className="detail-modal-header"><div><p className="eyebrow orange">TRAINING</p><h2>{event.title}</h2></div><button className="sheet-icon-button" onClick={onClose} aria-label="Sluiten"><Icon name="close" /></button></header><div className="detail-modal-body"><div className="detail-meta-grid"><div><Icon name="calendar"/><span>{formatLongDate(event.start)}</span></div><div><Icon name="clock"/><span>{formatTimeRange(event.start,event.end)}</span></div>{event.meetAt && <div><Icon name="people"/><span>Verzamelen {formatClock(event.meetAt)}</span></div>}{event.location && <div><Icon name="pin"/><span>{event.location}</span></div>}</div><EventAudience event={event} />{event.description && <p className="detail-description">{event.description}</p>}<div className="detail-attendance"><h3>Ben je erbij?</h3><AttendanceButtons current={current?.status} onSelect={status => onAttendance(event,status)} busy={busy} /></div>{canManage && <><div className="detail-manage-actions"><button className="primary detail-edit" onClick={onEdit}>Training aanpassen</button>{onManageAttendance && <button className="secondary orange-outline" onClick={onManageAttendance}>Aanwezigheid beheren</button>}</div><AttendanceSummary event={event} rows={attendance} profiles={profiles} memberships={memberships} expanded /></>}</div></section></div>
}

function AttendanceButtons({ current, onSelect, busy, compact=false }) {
  return <div className={`attendance-buttons ${compact?'compact':''}`}><button className={current==='present'?'attendance-btn present active':'attendance-btn present'} disabled={busy} onClick={() => onSelect('present')}>✓ Aanwezig</button><button className={current==='maybe'?'attendance-btn maybe active':'attendance-btn maybe'} disabled={busy} onClick={() => onSelect('maybe')}>? Misschien</button><button className={current==='absent'?'attendance-btn absent active':'attendance-btn absent'} disabled={busy} onClick={() => onSelect('absent')}>✕ Afwezig</button></div>
}

function AttendanceSummary({ event, rows, profiles, memberships, expanded=false }) {
  const [filter, setFilter] = useState('all')
  const profileMap = Object.fromEntries(profiles.map(p => [p.id,p]))
  const teamIds = new Set((event.teamIds ?? []).map(Number))
  const guestIds = new Set(event.guestProfileIds ?? [])
  const invitedIds = new Set([
    ...memberships.filter(m => teamIds.has(Number(m.team_id))).map(m => m.profile_id),
    ...guestIds
  ])
  const responseMap = Object.fromEntries(rows.map(row => [row.profile_id,row]))
  const filterIds = (() => {
    if (filter === 'all') return invitedIds
    if (filter === 'guests') return guestIds
    const teamId = Number(filter.replace('team-',''))
    return new Set(memberships.filter(m => Number(m.team_id)===teamId).map(m => m.profile_id))
  })()
  const eligible = [...filterIds].filter(id => invitedIds.has(id))
  const groups = { present: [], maybe: [], absent: [], none: [] }
  eligible.forEach(id => {
    const row = responseMap[id]
    if (!row) groups.none.push({ profile_id:id })
    else groups[row.status]?.push(row)
  })
  const summaryText = `${groups.present.length} aanwezig · ${groups.maybe.length} misschien · ${groups.absent.length} afwezig · ${groups.none.length} geen reactie`
  const content = <div className="attendance-summary-content"><div className="attendance-filter-row"><button className={filter==='all'?'active':''} onClick={() => setFilter('all')}>Iedereen</button>{(event.teams??[]).map(team => <button key={team.id} className={filter===`team-${team.id}`?'active':''} onClick={() => setFilter(`team-${team.id}`)}>{team.name}</button>)}{guestIds.size>0 && <button className={filter==='guests'?'active':''} onClick={() => setFilter('guests')}>Gasten</button>}</div><div className="attendance-groups">{[['present','Aanwezig'],['maybe','Misschien'],['absent','Afwezig'],['none','Geen reactie']].map(([key,label]) => <div key={key}><strong>{label} · {groups[key].length}</strong>{groups[key].length ? groups[key].map((row,i) => <p key={row.id || `${row.profile_id}-${i}`}>{personName(profileMap[row.profile_id])}{row.note ? ` — ${row.note}` : ''}</p>) : <p className="muted">Niemand</p>}</div>)}</div></div>
  if (expanded) return <section className="attendance-expanded"><div className="attendance-counts"><strong>Aanwezigheid</strong><span>{summaryText}</span></div>{content}</section>
  return <details className="attendance-summary"><summary>{summaryText}</summary>{content}</details>
}

function TrainingEditor({ profile, teams, profiles, memberships, event, onClose, onSaved }) {
  const [directoryTeams, setDirectoryTeams] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [guestSearch, setGuestSearch] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [repeatEvery, setRepeatEvery] = useState('1')
  const [repeatUntil, setRepeatUntil] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState(() => (event?.teamIds?.length ? event.teamIds.map(String) : event?.teamId ? [String(event.teamId)] : []))
  const [selectedGuests, setSelectedGuests] = useState(() => event?.guestProfileIds ?? [])
  const [form, setForm] = useState(() => event ? {
    title:event.title||'Training', date:toDateInput(event.start), start:toTimeInput(event.start), end:toTimeInput(event.end), meet:toTimeInput(event.meetAt), location_name:event.location||'', location_address:event.locationAddress||'', description:event.description||''
  } : { title:'Training', date:'', start:'', end:'', meet:'', location_name:'', location_address:'', description:'' })

  useEffect(() => {
    supabase.from('teams').select('id,name,sport,is_active,season_id').eq('is_active',true).order('name').then(({data}) => setDirectoryTeams(data??[]))
  }, [])

  const selectableTeams = profile?.role === 'admin' ? directoryTeams : directoryTeams.filter(team => teams.some(own => Number(own.id)===Number(team.id) && own.member_role==='coach'))
  useEffect(() => { if (!selectedTeamIds.length && selectableTeams[0]) setSelectedTeamIds([String(selectableTeams[0].id)]) }, [selectableTeams.length])

  const selectedTeamMemberIds = new Set(memberships.filter(m => selectedTeamIds.includes(String(m.team_id))).map(m => m.profile_id))
  const search = guestSearch.trim().toLowerCase()
  const guestCandidates = profiles.filter(person => !selectedTeamMemberIds.has(person.id) && !selectedGuests.includes(person.id) && (!search || `${personName(person)} ${person.jersey_number||''}`.toLowerCase().includes(search)))
  const invitedCount = new Set([...selectedTeamMemberIds, ...selectedGuests]).size
  const teamMap = Object.fromEntries(directoryTeams.map(team => [String(team.id),team]))
  function profileTeamNames(profileId) {
    return memberships.filter(m => m.profile_id===profileId).map(m => teamMap[String(m.team_id)]?.name).filter(Boolean).slice(0,2).join(' · ') || 'Geen team'
  }
  function toggleTeam(id) {
    const key=String(id)
    setSelectedTeamIds(current => current.includes(key) ? (current.length===1 ? current : current.filter(v => v!==key)) : [...current,key])
  }
  function addGuest(id) { setSelectedGuests(current => [...current,id]); setGuestSearch('') }
  function removeGuest(id) { setSelectedGuests(current => current.filter(v => v!==id)) }

  async function syncRelations(eventId) {
    const currentTeams = new Set((event?.teamIds ?? []).map(String))
    const desiredTeams = new Set(selectedTeamIds)
    const addTeams = [...desiredTeams].filter(id => !currentTeams.has(id))
    const removeTeams = [...currentTeams].filter(id => !desiredTeams.has(id))
    if (addTeams.length) {
      const { error } = await supabase.from('event_teams').insert(addTeams.map(team_id => ({ event_id:eventId, team_id:Number(team_id) })))
      if (error) throw error
    }
    for (const teamId of removeTeams) {
      const { error } = await supabase.from('event_teams').delete().eq('event_id',eventId).eq('team_id',Number(teamId))
      if (error) throw error
    }
    const currentGuests = new Set(event?.guestProfileIds ?? [])
    const desiredGuests = new Set(selectedGuests)
    const addGuests = [...desiredGuests].filter(id => !currentGuests.has(id))
    const removeGuests = [...currentGuests].filter(id => !desiredGuests.has(id))
    if (addGuests.length) {
      const { error } = await supabase.from('event_participants').insert(addGuests.map(profile_id => ({ event_id:eventId, profile_id, added_by:profile.id })))
      if (error) throw error
    }
    for (const profileId of removeGuests) {
      const { error } = await supabase.from('event_participants').delete().eq('event_id',eventId).eq('profile_id',profileId)
      if (error) throw error
    }
  }

  async function save() {
    if (!selectedTeamIds.length || !form.date || !form.start) return setError('Kies minimaal één team, een datum en starttijd.')
    setBusy(true); setError('')
    const payload = { team_id:Number(selectedTeamIds[0]), type:'training', title:form.title.trim()||'Training', description:form.description.trim()||null, start_at:combineDateTime(form.date,form.start), end_at:form.end?combineDateTime(form.date,form.end):null, meet_at:form.meet?combineDateTime(form.date,form.meet):null, location_name:form.location_name.trim()||null, location_address:form.location_address.trim()||null, updated_at:new Date().toISOString() }
    try {
      let eventId = event?.id
      if (eventId) {
        const { error } = await supabase.from('events').update(payload).eq('id',eventId)
        if (error) throw error
        await syncRelations(eventId)
      } else {
        const { data, error } = await supabase.from('events').insert({ ...payload, created_by:profile.id }).select('id').single()
        if (error) throw error
        eventId = data.id
        const { error: teamError } = await supabase.from('event_teams').insert(selectedTeamIds.map(team_id => ({ event_id:eventId, team_id:Number(team_id) })))
        if (teamError) { await supabase.from('events').delete().eq('id',eventId); throw teamError }
        if (selectedGuests.length) {
          const { error: guestError } = await supabase.from('event_participants').insert(selectedGuests.map(profile_id => ({ event_id:eventId, profile_id, added_by:profile.id })))
          if (guestError) throw guestError
        }
        if (repeat && repeatUntil) {
          const interval = Math.max(1, Number(repeatEvery || 1))
          const base = new Date(`${form.date}T12:00:00`)
          const until = new Date(`${repeatUntil}T23:59:59`)
          const copies = []
          for (let d = new Date(base.getTime() + interval*7*86400000); d <= until && copies.length < 52; d = new Date(d.getTime() + interval*7*86400000)) {
            const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            copies.push({ ...payload, start_at:combineDateTime(date,form.start), end_at:form.end?combineDateTime(date,form.end):null, meet_at:form.meet?combineDateTime(date,form.meet):null, created_by:profile.id })
          }
          if (copies.length) {
            const { data: created, error: repeatError } = await supabase.from('events').insert(copies).select('id')
            if (repeatError) throw repeatError
            const rels = (created || []).flatMap(row => selectedTeamIds.map(team_id => ({ event_id:row.id, team_id:Number(team_id) })))
            if (rels.length) { const { error: relError } = await supabase.from('event_teams').insert(rels); if (relError) throw relError }
            const guests = (created || []).flatMap(row => selectedGuests.map(profile_id => ({ event_id:row.id, profile_id, added_by:profile.id })))
            if (guests.length) { const { error: guestRepeatError } = await supabase.from('event_participants').insert(guests); if (guestRepeatError) throw guestRepeatError }
          }
        }
      }
      setBusy(false); onSaved()
    } catch (err) { setBusy(false); setError(err.message || 'Opslaan mislukt.') }
  }
  async function remove() {
    if (!event?.id || !window.confirm('Training verwijderen?')) return
    setBusy(true); const {error} = await supabase.from('events').delete().eq('id',event.id); setBusy(false)
    if (error) setError(error.message); else onSaved()
  }
  return <div className="sheet-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) onClose() }}><section className="admin-sheet training-sheet"><div className="sheet-handle"/><header className="sheet-header"><span className="sheet-icon-spacer"/><div className="sheet-title-center"><p className="eyebrow orange">{event?'TRAINING BEHEREN':'NIEUWE TRAINING'}</p><h2>{event?'Training aanpassen':'Training toevoegen'}</h2></div><button className="sheet-icon-button" onClick={onClose}><Icon name="close" /></button></header><div className="sheet-body"><div className="form-stack training-form"><section className="audience-picker"><div className="picker-heading"><div><strong>Teams & deelnemers</strong><small>{invitedCount} deelnemer{invitedCount===1?'':'s'} uitgenodigd</small></div></div><div className="team-checkbox-list">{selectableTeams.map(team => <label className="team-check" key={team.id}><input type="checkbox" checked={selectedTeamIds.includes(String(team.id))} onChange={() => toggleTeam(team.id)} /><span><strong>{team.name}</strong><small>{capitalize(team.sport)}</small></span></label>)}</div>{!selectableTeams.length && <div className="admin-empty">Je hebt geen teams waarvoor je trainingen kunt beheren.</div>}<div className="guest-picker"><div className="picker-heading"><div><strong>Extra deelnemers</strong><small>Voor iemand die een keer meetraint</small></div></div>{selectedGuests.length>0 && <div className="selected-guests">{selectedGuests.map(id => { const person=profiles.find(p => p.id===id); return <button key={id} type="button" onClick={() => removeGuest(id)}>{personName(person)} <span>×</span></button> })}</div>}<label>Speler zoeken<input type="search" value={guestSearch} onChange={e => setGuestSearch(e.target.value)} placeholder="Zoek op naam of rugnummer" /></label>{guestSearch && <div className="guest-results">{guestCandidates.slice(0,10).map(person => <button type="button" key={person.id} onClick={() => addGuest(person.id)}><span className="member-avatar small">{initials(person)}</span><span><strong>{personName(person)}</strong><small>{profileTeamNames(person.id)}</small></span><span>+ Toevoegen</span></button>)}{!guestCandidates.length && <div className="admin-empty">Geen spelers gevonden.</div>}</div>}</div></section><label>Titel<input value={form.title} onChange={e => setForm({...form,title:e.target.value})}/></label><div className="form-two equal-fields"><label>Datum<input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label><label>Verzameltijd<input type="time" value={form.meet} onChange={e => setForm({...form,meet:e.target.value})}/></label></div><div className="form-two equal-fields"><label>Starttijd<input type="time" value={form.start} onChange={e => setForm({...form,start:e.target.value})}/></label><label>Eindtijd<input type="time" value={form.end} onChange={e => setForm({...form,end:e.target.value})}/></label></div>{!event && <section className="repeat-card"><label className="repeat-toggle"><span><strong>Herhalen</strong><small>Maak automatisch meerdere trainingen aan</small></span><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} /></label>{repeat && <div className="form-two equal-fields"><label>Herhaal elke<select value={repeatEvery} onChange={e => setRepeatEvery(e.target.value)}><option value="1">1 week</option><option value="2">2 weken</option><option value="3">3 weken</option><option value="4">4 weken</option></select></label><label>Eindigt<input type="date" value={repeatUntil} min={form.date} onChange={e => setRepeatUntil(e.target.value)} /></label></div>}</section>}<label>Locatie<input value={form.location_name} onChange={e => setForm({...form,location_name:e.target.value})} placeholder="Bijv. Van der Aart Sportpark"/></label><label>Adres<input value={form.location_address} onChange={e => setForm({...form,location_address:e.target.value})} placeholder="Optioneel"/></label><label>Omschrijving<textarea rows="4" value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Wat gaan we trainen?"/></label>{error && <div className="notice error">{error}</div>}<button className="primary" disabled={busy||!selectableTeams.length} onClick={save}>{busy?'Opslaan…':'Opslaan'}</button>{event && <button className="secondary orange-outline" disabled={busy} onClick={remove}>Training verwijderen</button>}</div></div></section></div>
}

function AbsenceModal({ event, reason, setReason, busy, onCancel, onConfirm }) {
  return <div className="modal-backdrop"><section className="confirm-modal"><span className="confirm-icon"><Icon name="calendar" /></span><h2>Afmelden bevestigen</h2><p>Je meldt je af voor <strong>{event.title}</strong> op {formatShortDate(event.start)}.</p><label>Reden van afmelding<textarea rows="4" value={reason} onChange={e => setReason(e.target.value)} placeholder="Waarom kun je niet aanwezig zijn?" autoFocus required /></label><div className="modal-actions"><button className="secondary" onClick={onCancel} disabled={busy}>Annuleren</button><button className="danger-solid" onClick={onConfirm} disabled={busy}>{busy?'Opslaan…':'Afmelding bevestigen'}</button></div></section></div>
}


function PlayerInvitationCards({ session, requests = [], candidates = [], teams = [], onRefresh }) {
  const mine=candidates.filter(c=>c.profile_id===session?.user?.id && ['invited','available','confirmed'].includes(c.response))
  if(!mine.length) return null
  async function respond(candidate,response){
    await supabase.rpc('respond_player_request_candidate',{candidate_id: candidate.id, new_response: response})
    await onRefresh?.()
  }
  return <section className="player-invite-stack"><p className="eyebrow orange">UITNODIGINGEN</p>{mine.map(c=>{const req=requests.find(r=>r.id===c.request_id);if(!req)return null;return <article className="player-invite-card" key={c.id}><div className="player-invite-copy"><span>Uitnodiging om mee te spelen</span><h3>{req.event_title}</h3><p><strong>{req.position}</strong>{req.note?` · ${req.note}`:''}</p><small>{formatLongDate(req.event_start)}</small></div>{c.response==='invited'?<div className="player-invite-actions"><button className="primary" onClick={()=>respond(c,'available')}>Ik kan</button><button className="secondary" onClick={()=>respond(c,'unavailable')}>Ik kan niet</button></div>:<div className="invite-response-state">{c.response==='confirmed'?'Je bent bevestigd voor deze activiteit.':'Je hebt aangegeven dat je kunt. De coach bevestigt wie meegaat.'}</div>}</article>})}</section>
}

function CoachDashboard({ session, profile, teams, gameStats = [], measurements = [], trainingEvents = [], calendarEvents = [], attendance = [], gameAttendance = [], profiles = [], memberships = [], messages = [], playerRequests = [], playerCandidates = [], pushSubscriptions = [], ownAttendance = {}, onAttendance, attendanceBusy = false, clubLocations = [], transportEvents = [], transportResponses = [], onRefresh, onMessage, swingAccess }) {
  const ownCoachTeams = teams.filter(team => team.member_role === 'coach' || profile?.role === 'admin')
  const [selectedTeamId, setSelectedTeamId] = useState(String(ownCoachTeams[0]?.id || ''))
  const [trainingEditorOpen, setTrainingEditorOpen] = useState(false)
  const [editingCoachEvent, setEditingCoachEvent] = useState(null)
  const [messageOpen, setMessageOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [finalizeSession, setFinalizeSession] = useState(null)
  const [historyView, setHistoryView] = useState('sessions')
  const [allTeams, setAllTeams] = useState(ownCoachTeams)
  const [detailEvent, setDetailEvent] = useState(null)
  const [requestDetail, setRequestDetail] = useState(null)
  const [coachPlayerProfile, setCoachPlayerProfile] = useState(null)
  const [coachStatsOpen, setCoachStatsOpen] = useState(false)
  const [statsPlayer, setStatsPlayer] = useState(null)
  const [statEntryOpen, setStatEntryOpen] = useState(null)
  const [swingAnalyzerOpen, setSwingAnalyzerOpen] = useState(false)

  useEffect(() => {
    supabase.from('teams').select('id,name,sport,is_active,season_id,foys_match_text,seasons(is_active)').eq('is_active', true).then(({data}) => {
      const rows=(data||[]).filter(t=>t.seasons?.is_active!==false)
      setAllTeams(rows)
      if (profile?.role === 'admin' && !selectedTeamId && rows[0]) setSelectedTeamId(String(rows[0].id))
    })
  }, [profile?.role])

  const coachTeams = profile?.role === 'admin' ? allTeams : ownCoachTeams
  const selectedTeam = coachTeams.find(t => String(t.id) === String(selectedTeamId)) || coachTeams[0]
  const teamId = Number(selectedTeam?.id || 0)
  const teamMemberRows = memberships.filter(m => Number(m.team_id) === teamId && m.member_role === 'player')
  const teamMemberIds = teamMemberRows.map(m => m.profile_id)
  const teamPlayers = teamMemberIds.map(id => profiles.find(p => p.id === id)).filter(Boolean)
  const teamTrainingEvents = trainingEvents.filter(ev => (ev.teamIds || [ev.teamId]).map(Number).includes(teamId))
  const teamGames = calendarEvents.filter(ev => selectedTeam && eventTeamMatches(ev, [selectedTeam]).includes(teamId))
  const now = Date.now()
  const upcoming = [...teamTrainingEvents, ...teamGames].filter(ev => new Date(ev.start).getTime() >= now).sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,8)
  const past = [...teamTrainingEvents, ...teamGames].filter(ev => new Date(ev.start).getTime() < now).sort((a,b)=>new Date(b.start)-new Date(a.start)).slice(0,50)
  const openRequests = playerRequests.filter(r => Number(r.requesting_team_id) === teamId && r.status !== 'closed')
  const incomingRequests = playerRequests.filter(r => Number(r.target_team_id) === teamId && Number(r.requesting_team_id) !== teamId && r.status === 'open')
  const [nominateRequest, setNominateRequest] = useState(null)
  const pushEnabledIds = new Set(pushSubscriptions.filter(s=>s.enabled!==false).map(s=>s.profile_id))

  const historyRows = teamPlayers.map(person => {
    let present=0, absent=0, injured=0, late=0, total=0
    teamTrainingEvents.filter(ev=>new Date(ev.start).getTime()<now).forEach(ev=>{
      const row=attendance.find(a=>String(a.event_id)===String(ev.id)&&a.profile_id===person.id)
      if(row){ total++; if(row.status==='present')present++; if(row.status==='absent')absent++; if(row.status==='injured')injured++; if(row.status==='late')late++; }
    })
    teamGames.filter(ev=>new Date(ev.start).getTime()<now).forEach(ev=>{
      const key=eventTransportKey(ev)
      const row=gameAttendance.find(a=>a.event_key===key&&a.profile_id===person.id)
      if(row){ total++; if(row.status==='present')present++; if(row.status==='absent')absent++; if(row.status==='injured')injured++; if(row.status==='late')late++; }
    })
    return { person, total, present, absent, injured, late, missed:absent+injured }
  })

  async function confirmCandidate(candidate) {
    const { error } = await supabase.rpc('confirm_player_request_candidate',{candidate_id: candidate.id})
    if(error) return onMessage(`Bevestigen mislukt: ${error.message}`)
    onMessage('Invaller bevestigd.'); await onRefresh()
  }

  if (!coachTeams.length) return <section><ScreenHeader title="Coach"/><EmptyState icon="team" title="Geen coachteam gekoppeld" text="Je coachomgeving verschijnt zodra je als coach aan een team bent gekoppeld." /></section>

  return <section className="coach-page">
    <div className="coach-heading"><div><p className="eyebrow orange">COACHOMGEVING</p><h1>Coach</h1></div>{coachTeams.length>1 && <select className="coach-team-select" value={selectedTeam?.id || ''} onChange={e=>setSelectedTeamId(e.target.value)}>{coachTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>}</div>
    <p className="coach-team-label">{selectedTeam?.name}</p>

    <div className="coach-quick-grid">
      <button onClick={()=>{setEditingCoachEvent(null);setTrainingEditorOpen(true)}}><span><Icon name="calendar"/></span><strong>Training toevoegen</strong><small>Eenmalig of herhalend</small></button>
      <button onClick={()=>setMessageOpen(true)}><span><Icon name="bell"/></span><strong>Teambericht</strong><small>Ook als pushmelding</small></button>
      <button onClick={()=>setRequestOpen(true)}><span><Icon name="people"/></span><strong>Invaller aanvragen</strong><small>Verzoek aan coach van ander team</small></button>
      <button onClick={()=>setCoachStatsOpen(true)}><span><Icon name="stats"/></span><strong>Team stats</strong><small>Team & persoonlijke cijfers</small></button>
      {(profile?.role === 'admin' || swingAccess === 'coach' || swingAccess === 'admin') && <button className="swing-launch" onClick={()=>setSwingAnalyzerOpen(true)}><span><Icon name="swing"/></span><strong>Swing Analyzer</strong><small>Video, coachanalyse & drills</small></button>}
    </div>

    <SectionTitle title="Komend" />
    <div className="coach-session-list">{upcoming.length ? upcoming.map(ev=>{
      const rows=ev.type==='training'?attendance.filter(a=>String(a.event_id)===String(ev.id)):gameAttendance.filter(a=>a.event_key===eventTransportKey(ev))
      const yes=rows.filter(r=>r.status==='present').length, maybe=rows.filter(r=>r.status==='maybe').length
      return <button type="button" className="coach-session-card" key={ev.uid||`${ev.type}-${ev.id}`} onClick={()=>setDetailEvent(ev)}><div><span className="coach-session-type">{eventTypeLabel(ev)}</span><strong>{ev.title}</strong><small>{formatShortDate(ev.start)} · {formatTimeRange(ev.start,ev.end)}</small></div><div className="coach-session-count"><strong>{yes}</strong><span>aanwezig</span>{maybe>0&&<small>{maybe} misschien</small>}<Icon name="chevron"/></div></button>
    }) : <p className="muted coach-empty-line">Geen komende activiteiten voor dit team.</p>}</div>

    <SectionTitle title="Aanwezigheid & historie" />
    <div className="coach-history-tabs"><button className={historyView==='sessions'?'active':''} onClick={()=>setHistoryView('sessions')}>Activiteiten</button><button className={historyView==='players'?'active':''} onClick={()=>setHistoryView('players')}>Per speler</button></div>
    {historyView==='sessions' ? <div className="coach-history-list">{past.map(ev=>{
      const rows=ev.type==='training'?attendance.filter(a=>String(a.event_id)===String(ev.id)):gameAttendance.filter(a=>a.event_key===eventTransportKey(ev))
      const c={present:0,absent:0,injured:0,late:0}; rows.forEach(r=>{if(c[r.status]!=null)c[r.status]++})
      return <button key={ev.uid||`${ev.type}-${ev.id}`} onClick={()=>setFinalizeSession(ev)}><div><strong>{ev.title}</strong><small>{formatShortDate(ev.start)} · {eventTypeLabel(ev)}</small></div><div className="history-statuses"><span>{c.present} aanwezig</span><span>{c.absent} afwezig</span><span>{c.injured} geblesseerd</span><span>{c.late} te laat</span></div><Icon name="chevron"/></button>
    })}{!past.length&&<p className="muted coach-empty-line">Nog geen afgelopen activiteiten.</p>}</div> : <div className="coach-player-table"><div className="coach-player-head"><span>Speler</span><span>Gemist</span><span>Te laat</span></div>{historyRows.map(r=><article key={r.person.id} className="coach-player-profile-row" onClick={()=>setCoachPlayerProfile(r.person)} role="button" tabIndex="0"><span className="coach-player-name"><ProfileAvatar person={r.person} size="small"/><strong>{r.person.first_name || personName(r.person)}</strong></span><span><strong>{r.missed}</strong><small>{r.absent} afw · {r.injured} gebl</small></span><span><strong>{r.late}</strong></span></article>)}</div>}

    <SectionTitle title="Invallers" />
    {incomingRequests.length > 0 && <div className="coach-request-list incoming-requests">{incomingRequests.map(req=>{const requestingTeam=allTeams.find(t=>Number(t.id)===Number(req.requesting_team_id));return <article key={`incoming-${req.id}`}><button type="button" className="request-main-button" onClick={()=>setRequestDetail(req)}><div><span className="coach-session-type">VERZOEK ONTVANGEN</span><strong>{requestingTeam?.name || 'Ander team'} zoekt {req.position}</strong><small>{req.event_title} · {formatShortDate(req.event_start)}</small><p>{req.note || 'Geen extra opmerking.'}</p></div><Icon name="chevron"/></button><button className="secondary orange-outline" onClick={()=>setNominateRequest(req)}>Speelsters voordragen</button></article>})}</div>}
    <div className="coach-request-list">{openRequests.length ? openRequests.map(req=>{
      const candidates=playerCandidates.filter(c=>c.request_id===req.id)
      const targetTeam=allTeams.find(t=>Number(t.id)===Number(req.target_team_id))
      return <article key={req.id}><button type="button" className="request-main-button" onClick={()=>setRequestDetail(req)}><div><strong>{req.position || 'Speler gezocht'}</strong><small>{req.event_title} · {formatShortDate(req.event_start)}</small><p>Verzoek aan <strong>{targetTeam?.name || 'ander team'}</strong>{req.note?` · ${req.note}`:''}</p></div><Icon name="chevron"/></button><div className="request-chips"><span>{candidates.length} voorgedragen</span><span>{candidates.filter(c=>c.response==='available').length} beschikbaar</span><span>{candidates.filter(c=>c.response==='confirmed').length} bevestigd</span></div><div className="request-candidate-list">{candidates.filter(c=>['invited','available','confirmed'].includes(c.response)).map(c=>{const person=profiles.find(p=>p.id===c.profile_id);return <div key={c.id}><span><ProfileAvatar person={person} size="small"/><strong>{person?.first_name||personName(person)}</strong><small>{playerSportLine(person)} · {c.response==='confirmed'?'Bevestigd':c.response==='available'?'Kan meedoen':'Uitgenodigd'}</small></span>{c.response==='available'&&<button className="mini-action" onClick={()=>confirmCandidate(c)}>Bevestigen</button>}</div>})}</div></article>
    }) : <p className="muted coach-empty-line">Geen uitgaande invallerverzoeken.</p>}</div>

    <SectionTitle title="Pushstatus team" />
    <div className="coach-push-list">{teamPlayers.map(person=><article key={person.id}><span><ProfileAvatar person={person} size="small"/><strong>{person.first_name||personName(person)}</strong></span><small>{pushEnabledIds.has(person.id)?'Meldingen actief':'Nog niet ingeschakeld'}</small></article>)}</div>

    {trainingEditorOpen && <TrainingEditor profile={profile} teams={coachTeams} profiles={profiles} memberships={memberships} event={editingCoachEvent} onClose={()=>{setTrainingEditorOpen(false);setEditingCoachEvent(null)}} onSaved={async()=>{setTrainingEditorOpen(false);setEditingCoachEvent(null);await onRefresh()}} />}
    {messageOpen && <CoachMessageModal session={session} team={selectedTeam} onClose={()=>setMessageOpen(false)} onSaved={async()=>{setMessageOpen(false);await onRefresh()}} onMessage={onMessage} />}
    {requestOpen && <PlayerRequestModal session={session} team={selectedTeam} teams={coachTeams} profiles={profiles} memberships={memberships} calendarEvents={calendarEvents} trainingEvents={trainingEvents} onClose={()=>setRequestOpen(false)} onSaved={async()=>{setRequestOpen(false);await onRefresh()}} onMessage={onMessage} />}
    {nominateRequest && <NominatePlayersModal session={session} request={nominateRequest} team={selectedTeam} profiles={profiles} memberships={memberships} onClose={()=>setNominateRequest(null)} onSaved={async()=>{setNominateRequest(null);await onRefresh()}} onMessage={onMessage} />}
    {finalizeSession && <FinalizeAttendanceModal event={finalizeSession} team={selectedTeam} players={teamPlayers} attendance={attendance} gameAttendance={gameAttendance} onClose={()=>setFinalizeSession(null)} onSaved={onRefresh} onMessage={onMessage} />}
    {requestDetail && <PlayerRequestDetailModal request={requestDetail} selectedTeam={selectedTeam} allTeams={allTeams} profiles={profiles} candidates={playerCandidates.filter(c=>c.request_id===requestDetail.id)} onConfirm={confirmCandidate} onNominate={()=>{setNominateRequest(requestDetail);setRequestDetail(null)}} onClose={()=>setRequestDetail(null)} />}
    {detailEvent?.type === 'training' && <TrainingDetailModal event={detailEvent} current={ownAttendance[String(detailEvent.id)]} onAttendance={onAttendance} busy={attendanceBusy} canManage={true} onEdit={()=>{setEditingCoachEvent(detailEvent);setDetailEvent(null);setTrainingEditorOpen(true)}} onManageAttendance={()=>setFinalizeSession(detailEvent)} onClose={()=>setDetailEvent(null)} attendance={attendance.filter(row=>String(row.event_id)===String(detailEvent.id))} profiles={profiles} memberships={memberships} />}
    {detailEvent && detailEvent.type !== 'training' && <ActivityDetailModal event={detailEvent} profile={profile} teams={[selectedTeam]} profiles={profiles} memberships={memberships} clubLocations={clubLocations} transportEvent={findTransportEvent(detailEvent, transportEvents)} transportResponses={transportResponses} onChanged={onRefresh} onManageAttendance={()=>setFinalizeSession(detailEvent)} onClose={()=>setDetailEvent(null)} />}
    {coachStatsOpen && <CoachStatsModal team={selectedTeam} players={teamPlayers} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={teamTrainingEvents} calendarEvents={teamGames} gameStats={gameStats} measurements={measurements} onPlayer={person=>setStatsPlayer(person)} onAddGame={()=>setStatEntryOpen('game')} onAddMeasurement={()=>setStatEntryOpen('measurement')} onClose={()=>setCoachStatsOpen(false)} />}
    {statsPlayer && <PlayerStatsModal person={statsPlayer} team={selectedTeam} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={teamTrainingEvents} calendarEvents={teamGames} gameStats={gameStats} measurements={measurements} onClose={()=>setStatsPlayer(null)} />}
    {statEntryOpen && <CoachStatEntryModal mode={statEntryOpen} team={selectedTeam} players={teamPlayers} onClose={()=>setStatEntryOpen(null)} onSaved={async()=>{setStatEntryOpen(null);await onRefresh()}} />}
    {swingAnalyzerOpen && <SwingAnalyzerModal session={session} profile={profile} accessLevel={profile?.role === 'admin' ? 'admin' : swingAccess} team={selectedTeam} players={teamPlayers} profiles={profiles} memberships={memberships} onClose={()=>setSwingAnalyzerOpen(false)} />}
    {coachPlayerProfile && <PlayerProfileModal person={coachPlayerProfile} team={selectedTeam} viewerProfile={profile} viewerMembership={{member_role:'coach'}} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} memberships={memberships} onClose={()=>setCoachPlayerProfile(null)} />}
  </section>
}


function coreStatsForPlayer(personId, team, attendance=[], gameAttendance=[], trainingEvents=[], calendarEvents=[], gameStats=[], measurements=[]) {
  const games=gameStats.filter(r=>r.profile_id===personId && (!team || Number(r.team_id)===Number(team.id)))
  const sums=games.reduce((a,r)=>{['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>a[k]=(a[k]||0)+Number(r[k]||0));return a},{})
  const avg=sums.ab?sums.h/sums.ab:null
  const den=(sums.ab||0)+(sums.bb||0)+(sums.hbp||0)+(sums.sf||0)
  const obp=den?((sums.h||0)+(sums.bb||0)+(sums.hbp||0))/den:null
  const slg=sums.ab?(sums.tb||0)/sums.ab:null
  const ops=obp!=null&&slg!=null?obp+slg:null
  const own=measurements.filter(r=>r.profile_id===personId && (!team || Number(r.team_id)===Number(team.id)))
  const latest=type=>[...own].filter(r=>r.metric_type===type).sort((a,b)=>new Date(b.measured_at)-new Date(a.measured_at))[0]
  const att=attendanceStatsForPerson(personId,team,attendance,gameAttendance,trainingEvents,calendarEvents)
  return {avg,ops,h:sums.h||0,rbi:sums.rbi||0,sb:sums.sb||0,exit:latest('exit_velocity'),home1:latest('home_to_first'),attendance:att}
}
function statRate(v){return v==null?'—':Number(v).toFixed(3).replace(/^0/,'')}

function SwingAnalyzerModal({ session, profile, accessLevel, team, players = [], profiles = [], memberships = [], onClose }) {
  const isAnalyzerAdmin = profile?.role === 'admin' || accessLevel === 'admin'
  const [view, setView] = useState('home')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [permissions, setPermissions] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [exitVelocity, setExitVelocity] = useState('')
  const [coachNote, setCoachNote] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiProgress, setAiProgress] = useState({progress:0,label:''})
  const [analysisBusy, setAnalysisBusy] = useState(false)
  const [savedResult, setSavedResult] = useState(null)
  const [permissionBusy, setPermissionBusy] = useState(false)

  useEffect(() => { loadSwingData() }, [team?.id, accessLevel])
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  async function loadSwingData() {
    setBusy(true); setError('')
    const analysisQuery = supabase.from('swing_analyses').select('*').order('recorded_at', { ascending: false })
    const assignmentQuery = supabase.from('swing_analyzer_assignments').select('*')
    const permissionQuery = isAnalyzerAdmin ? supabase.from('swing_analyzer_permissions').select('*') : Promise.resolve({data:[],error:null})
    const [a, as, p] = await Promise.all([analysisQuery, assignmentQuery, permissionQuery])
    if (a.error) setError(`Swing Analyzer is nog niet ingericht in Supabase: ${a.error.message}`)
    setAnalyses(a.data || []); setAssignments(as.data || []); setPermissions(p.data || []); setBusy(false)
  }

  const allowedPlayerIds = new Set(isAnalyzerAdmin ? players.map(p=>p.id) : assignments.filter(a=>a.coach_id===session?.user?.id).map(a=>a.player_id))
  const allowedPlayers = players.filter(p => allowedPlayerIds.has(p.id))
  const playerAnalyses = (playerId) => analyses.filter(a => a.player_id === playerId)
  const latestFor = (playerId) => playerAnalyses(playerId)[0]

  function openNew(person) {
    setSelectedPlayer(person); setVideoFile(null); setVideoUrl(''); setExitVelocity(''); setCoachNote(''); setAiResult(null); setAiProgress({progress:0,label:''}); setSavedResult(null); setView('new')
  }
  function pickVideo(file) {
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file); setVideoUrl(URL.createObjectURL(file)); setAiResult(null); setAiProgress({progress:0,label:''})
  }
  function scoreInfo() {
    if(!aiResult) return {overall:0,focus:[]}
    const metrics=aiResult.metrics||{}
    const confidences=aiResult.confidences||{}
    const sorted=Object.entries(metrics).filter(([key])=>(confidences[key]??0)>=45).sort((a,b)=>Number(a[1])-Number(b[1]))
    const focus=sorted.slice(0,2).map(([key,score])=>({ key, score:Number(score), confidence:confidences[key], ...swingMetricCatalog[key] }))
    return {overall:aiResult.overall||0,focus}
  }
  async function runAiAnalysis(){
    if(!videoFile){setError('Film of kies eerst een swingvideo.');return}
    setAnalysisBusy(true); setError(''); setAiResult(null); setAiProgress({progress:1,label:'AI voorbereiden…'})
    try{
      const result=await analyzeSwingVideo(videoFile,setAiProgress)
      setAiResult(result)
    }catch(err){setError(err?.message||'De AI-analyse kon niet worden uitgevoerd.')}
    finally{setAnalysisBusy(false)}
  }
  async function saveAnalysis() {
    if (!selectedPlayer) return
    if(!aiResult){setError('Start eerst de AI-analyse van de video.');return}
    const {overall,focus}=scoreInfo(); setBusy(true); setError('')
    const payload={ player_id:selectedPlayer.id, coach_id:session.user.id, team_id:team?.id || null, recorded_at:new Date().toISOString(), exit_velocity:exitVelocity?Number(exitVelocity):null, overall_score:overall, metrics:aiResult.metrics, focus, coach_note:coachNote.trim()||null, metric_confidence:aiResult.confidences||{}, analysis_meta:aiResult.meta||{}, analysis_version:'pose-ai-v1' }
    const {data,error}=await supabase.from('swing_analyses').insert(payload).select().single()
    if(error){setError(error.message);setBusy(false);return}
    setSavedResult(data); setAnalyses(prev=>[data,...prev]); setBusy(false); setView('result')
  }
  async function setCoachAccess(coachId, level) {
    setPermissionBusy(true); setError('')
    const {error}=await supabase.from('swing_analyzer_permissions').upsert({profile_id:coachId,access_level:level,granted_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'profile_id'})
    if(error) setError(error.message); else await loadSwingData(); setPermissionBusy(false)
  }
  async function toggleAssignment(coachId, playerId, checked) {
    setPermissionBusy(true); setError('')
    const q=checked ? supabase.from('swing_analyzer_assignments').upsert({coach_id:coachId,player_id:playerId,assigned_by:session.user.id},{onConflict:'coach_id,player_id'}) : supabase.from('swing_analyzer_assignments').delete().eq('coach_id',coachId).eq('player_id',playerId)
    const {error}=await q
    if(error) setError(error.message); else await loadSwingData(); setPermissionBusy(false)
  }
  const allCoachIds=[...new Set(memberships.filter(m=>m.member_role==='coach').map(m=>m.profile_id))]
  const coaches=allCoachIds.map(id=>profiles.find(p=>p.id===id)).filter(Boolean)

  return <div className="swing-layer"><section className="swing-shell" role="dialog" aria-modal="true" aria-label="Swing Analyzer">
    <header className="swing-topbar"><button className="swing-icon-btn" onClick={()=>view==='home'?onClose():setView('home')}><Icon name={view==='home'?'close':'back'}/></button><div><p className="eyebrow orange">MIJN OG</p><h2>Swing Analyzer <span>V1</span></h2></div>{isAnalyzerAdmin?<button className={`swing-admin-btn ${view==='access'?'active':''}`} onClick={()=>setView('access')}><Icon name="lock"/></button>:<span className="swing-icon-spacer"/>}</header>
    <div className="swing-body">
      <div className="swing-advisory"><Icon name="info"/><span><strong>Coachhulpmiddel</strong> De analyse ondersteunt jouw observatie en is niet leidend. Beoordeel altijd zelf de volledige swing en context.</span></div>
      {error && <div className="notice error">{error}</div>}
      {busy && view==='home' ? <div className="swing-loading">Analyses laden…</div> : <>
        {view==='home' && <>
          <section className="swing-hero"><div><p className="eyebrow">TEAM</p><h3>{team?.name || 'Mijn OG'}</h3><p>{allowedPlayers.length} speelster{allowedPlayers.length===1?'':'s'} beschikbaar</p></div><span className="swing-hero-mark"><Icon name="swing"/></span></section>
          <div className="swing-section-head"><div><p className="eyebrow orange">SPEELSTERS</p><h3>Kies een speelster</h3></div></div>
          <div className="swing-player-list">{allowedPlayers.map(person=>{const last=latestFor(person.id);return <button key={person.id} onClick={()=>{setSelectedPlayer(person);setView('player')}}><ProfileAvatar person={person} size="small"/><span><strong>{personName(person)}</strong><small>{last?`Laatste analyse ${formatSwingDate(last.recorded_at)}`:'Nog geen analyse'}</small></span>{last?<b className="swing-mini-score">{Math.round(last.overall_score)}</b>:<span className="swing-new-pill">Nieuw</span>}<Icon name="chevron"/></button>})}{!allowedPlayers.length&&<div className="swing-empty"><Icon name="lock"/><strong>Geen speelsters toegewezen</strong><p>Een Analyzer Admin kan speelsters aan jouw account koppelen.</p></div>}</div>
        </>}
        {view==='player' && selectedPlayer && <>
          <section className="swing-player-head"><ProfileAvatar person={selectedPlayer} size="large"/><div><p className="eyebrow orange">SWINGPROFIEL</p><h3>{personName(selectedPlayer)}</h3><p>{playerSportLine(selectedPlayer)}</p></div></section>
          <button className="swing-primary" onClick={()=>openNew(selectedPlayer)}><Icon name="camera"/> Nieuwe swing analyseren</button>
          <div className="swing-section-head"><div><p className="eyebrow orange">HISTORIE</p><h3>Analyses</h3></div></div>
          <div className="swing-history">{playerAnalyses(selectedPlayer.id).map(a=><article key={a.id}><div className="swing-score-orb">{Math.round(a.overall_score)}</div><div><strong>{formatSwingDate(a.recorded_at)}</strong><small>{a.focus?.[0]?.label || 'Coachinganalyse'}{a.exit_velocity?` · Exit velo ${a.exit_velocity}`:''}</small></div><button onClick={()=>{setSavedResult(a);setView('result')}}><Icon name="chevron"/></button></article>)}{!playerAnalyses(selectedPlayer.id).length&&<p className="muted">Nog geen swinganalyses opgeslagen.</p>}</div>
        </>}
        {view==='new' && selectedPlayer && <>
          <div className="swing-section-head"><div><p className="eyebrow orange">NIEUWE ANALYSE</p><h3>{personName(selectedPlayer)}</h3></div></div>
          <section className="swing-capture-card"><SwingCameraCapture videoUrl={videoUrl} onVideo={pickVideo}/>{videoFile&&<small className="swing-file-name">{videoFile.name} · {(videoFile.size/1024/1024).toFixed(1)} MB · wordt niet opgeslagen</small>}</section>
          <section className="swing-ai-card"><div className="swing-section-head compact"><div><p className="eyebrow orange">AI-VIDEOANALYSE</p><h3>Automatische swinganalyse</h3></div>{aiResult&&<span>{aiResult.overall}/100</span>}</div><p className="swing-help">De AI volgt lichaamslandmarks door de video en berekent automatisch technische indicatoren. De uitkomst is een coachhulpmiddel en geen biomechanische waarheid.</p>{analysisBusy?<div className="swing-ai-progress"><div><i style={{width:`${aiProgress.progress||0}%`}}/></div><strong>{aiProgress.label||'Analyseren…'}</strong><small>{aiProgress.progress||0}%</small></div>:!aiResult?<button className="swing-primary swing-ai-start" disabled={!videoFile} onClick={runAiAnalysis}><Icon name="swing"/> AI-analyse starten</button>:<><div className="swing-ai-ok"><strong>AI-analyse gereed</strong><small>Pose confidence {aiResult.meta?.pose_confidence??'—'}% · contactmoment is een AI-proxy</small></div><div className="swing-ai-metric-list">{Object.entries(aiResult.metrics||{}).map(([key,value])=>{const conf=aiResult.confidences?.[key]??0;const info=swingMetricCatalog[key]||{};return <article key={key}><span><strong>{info.label||key}</strong><small>{conf>=80?'Hoge':conf>=60?'Redelijke':'Lage'} betrouwbaarheid · {conf}%</small></span><b>{value}</b><div><i style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div><p className="swing-metric-observation"><b>Waarneming:</b> {metricObservation(key,value)}</p><p className="swing-metric-explain"><b>Wat houdt dit in?</b> {info.explanation||info.hint}</p></article>})}</div><button className="swing-secondary swing-ai-again" onClick={runAiAnalysis}>Opnieuw analyseren</button></>}</section>
          <div className="form-stack swing-extra"><label>Exit velo <span>(optioneel)</span><input type="number" inputMode="decimal" value={exitVelocity} onChange={e=>setExitVelocity(e.target.value)} placeholder="Bijv. 92"/></label><label>Coachnotitie <span>(optioneel)</span><textarea rows="3" value={coachNote} onChange={e=>setCoachNote(e.target.value)} placeholder="Wat zie jij in deze swing?"/></label></div>
          <button className="swing-primary" disabled={busy||analysisBusy||!aiResult} onClick={saveAnalysis}>{busy?'Opslaan…':!aiResult?'Eerst AI-analyse uitvoeren':'AI-analyse opslaan'}</button>
        </>}
        {view==='result' && savedResult && <SwingResult analysis={savedResult} player={profiles.find(p=>p.id===savedResult.player_id)||selectedPlayer} onNew={()=>openNew(profiles.find(p=>p.id===savedResult.player_id)||selectedPlayer)} />}
        {view==='access' && isAnalyzerAdmin && <>
          <div className="swing-section-head"><div><p className="eyebrow orange">TOEGANG</p><h3>Analyzer coaches</h3></div></div><p className="swing-help">Alleen toegewezen coaches zien de module. Analyzer Coaches zien uitsluitend de speelsters die hieronder aan hen zijn gekoppeld.</p>
          <div className="swing-access-list">{coaches.map(coach=>{const perm=permissions.find(p=>p.profile_id===coach.id);const level=perm?.access_level||'none';const assigned=new Set(assignments.filter(a=>a.coach_id===coach.id).map(a=>a.player_id));return <article key={coach.id}><div className="swing-access-head"><ProfileAvatar person={coach} size="small"/><span><strong>{personName(coach)}</strong><small>{level==='admin'?'Analyzer Admin':level==='coach'?'Analyzer Coach':'Geen toegang'}</small></span><select disabled={permissionBusy} value={level} onChange={e=>setCoachAccess(coach.id,e.target.value)}><option value="none">Geen toegang</option><option value="coach">Analyzer Coach</option><option value="admin">Analyzer Admin</option></select></div>{level==='coach'&&<div className="swing-assignment-grid">{players.map(player=><label key={player.id}><input type="checkbox" checked={assigned.has(player.id)} disabled={permissionBusy} onChange={e=>toggleAssignment(coach.id,player.id,e.target.checked)}/><span>{personName(player)}</span></label>)}</div>}</article>})}{!coaches.length&&<p className="muted">Geen coaches gevonden.</p>}</div>
        </>}
      </>}
    </div>
  </section></div>
}


function SwingCameraCapture({videoUrl,onVideo}){
  const liveRef=useRef(null), streamRef=useRef(null), recorderRef=useRef(null), chunksRef=useRef([])
  const [cameraOpen,setCameraOpen]=useState(false),[recording,setRecording]=useState(false),[cameraError,setCameraError]=useState('')
  useEffect(()=>()=>stopCamera(),[])
  async function openCamera(){
    setCameraError('')
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera is in deze browser niet beschikbaar.')
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})
      streamRef.current=stream;setCameraOpen(true)
      requestAnimationFrame(()=>{if(liveRef.current){liveRef.current.srcObject=stream;liveRef.current.play().catch(()=>{})}})
    }catch(e){setCameraError('Live camera kon niet worden geopend. Gebruik hieronder “Telefooncamera” of kies een bestaande video.')}
  }
  function stopCamera(){
    try{if(recorderRef.current?.state==='recording')recorderRef.current.stop()}catch{}
    streamRef.current?.getTracks?.().forEach(t=>t.stop());streamRef.current=null;setCameraOpen(false);setRecording(false)
  }
  function startRecording(){
    if(!streamRef.current)return
    chunksRef.current=[]
    try{
      const candidates=['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp9','video/webm']
      const mime=candidates.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||''
      const rec=mime?new MediaRecorder(streamRef.current,{mimeType:mime}):new MediaRecorder(streamRef.current)
      recorderRef.current=rec
      rec.ondataavailable=e=>{if(e.data?.size)chunksRef.current.push(e.data)}
      rec.onstop=()=>{
        const type=rec.mimeType||chunksRef.current[0]?.type||'video/webm'
        const ext=type.includes('mp4')?'mp4':'webm'
        const blob=new Blob(chunksRef.current,{type})
        if(blob.size){const file=new File([blob],`swing-${Date.now()}.${ext}`,{type});onVideo(file)}
        stopCamera()
      }
      rec.start();setRecording(true)
    }catch(e){setCameraError('Opnemen in de live camera wordt op dit toestel niet ondersteund. Gebruik “Telefooncamera”.')}
  }
  function stopRecording(){try{recorderRef.current?.stop()}catch{} setRecording(false)}
  return <>
    {cameraOpen?<div className="swing-live-camera"><video ref={liveRef} muted playsInline autoPlay/><div className="swing-live-overlay"><span className="swing-head-zone">HOOFD</span><span className="swing-body-zone">LICHAAM</span><span className="swing-bat-zone">KNUPPEL</span><span className="swing-ground-line"/><p>Volledig lichaam + hele knuppel binnen het kader</p></div><div className="swing-live-controls">{!recording?<button className="swing-record" onClick={startRecording}><i/> Opname starten</button>:<button className="swing-record recording" onClick={stopRecording}><i/> Stop opname</button>}<button className="swing-camera-close" onClick={stopCamera}>Sluiten</button></div></div>:videoUrl?<div className="swing-preview-wrap"><video className="swing-preview" src={videoUrl} controls playsInline/><div className="swing-preview-tip">Controleer: hele speler en knuppel zichtbaar, camera loodrecht op de slaglijn.</div></div>:<div className="swing-video-empty"><Icon name="camera"/><strong>Film vanuit vast zijaanzicht</strong><small>Camera op ongeveer heuphoogte · hele speler én volledige knuppel in beeld</small></div>}
    <div className="swing-capture-instructions"><strong>Zo kader je de opname</strong><div><span>1</span><p><b>Hoofd</b> ruim onder de bovenrand; niet afsnijden.</p></div><div><span>2</span><p><b>Knuppel</b> moet in stance én follow-through volledig zichtbaar blijven.</p></div><div><span>3</span><p><b>Voeten</b> altijd zichtbaar; camera stabiel en loodrecht op de slaglijn.</p></div></div>
    {cameraError&&<div className="notice warning">{cameraError}</div>}
    <div className="swing-file-actions"><button className="swing-primary" type="button" onClick={openCamera}><Icon name="camera"/> Live camera</button><label className="swing-secondary">Telefooncamera<input type="file" accept="video/*" capture="environment" onChange={e=>onVideo(e.target.files?.[0])}/></label><label className="swing-secondary">Video kiezen<input type="file" accept="video/*" onChange={e=>onVideo(e.target.files?.[0])}/></label></div>
  </>
}

function SwingResult({analysis,player,onNew}) {
  const metrics=analysis.metrics||{}; const focus=analysis.focus||[]
  return <div className="swing-result"><section className="swing-result-hero"><div><p className="eyebrow">ANALYSERESULTAAT</p><h3>{personName(player)}</h3><p>{formatSwingDate(analysis.recorded_at)}</p></div><div className="swing-big-score"><strong>{Math.round(analysis.overall_score)}</strong><small>/100</small></div></section><p className="swing-result-note">AI-ondersteunde videoanalyse. Gebruik dit als coachhulpmiddel; de score is niet leidend en geen laboratoriummeting.</p>
    <div className="swing-score-grid">{Object.entries(metrics).map(([key,value])=>{const conf=analysis.metric_confidence?.[key];const info=swingMetricCatalog[key]||{};return <article key={key}><span>{info.label||key}{conf!=null?<small> · {conf}% confidence</small>:null}</span><strong>{value}</strong><div><i style={{width:`${Math.max(0,Math.min(100,Number(value)))}%`}}/></div><p className="swing-metric-observation"><b>Waarneming:</b> {metricObservation(key,value)}</p><p className="swing-metric-explain"><b>Betekenis:</b> {info.explanation||info.hint}</p></article>})}</div>
    <div className="swing-section-head"><div><p className="eyebrow orange">FOCUSPUNTEN</p><h3>Hier zou ik aan werken</h3></div></div><div className="swing-focus-list">{focus.map((item,index)=><article key={item.key}><span>{index+1}</span><div><strong>{item.label}</strong><p>{item.feedback}</p><div className="swing-drill"><Icon name="swing"/><span><b>{item.drill}</b><small>{item.drillText}</small></span></div></div></article>)}</div>{analysis.coach_note&&<div className="swing-coach-note"><strong>Coachnotitie</strong><p>{analysis.coach_note}</p></div>}{analysis.exit_velocity&&<div className="swing-exit"><span>Exit velo</span><strong>{analysis.exit_velocity}</strong></div>}<button className="swing-primary" onClick={onNew}><Icon name="camera"/> Nieuwe swing vergelijken</button></div>
}

const swingMetricCatalog={
  head_stability:{label:'Head stability',hint:'Rust van het hoofd tijdens load en contact',explanation:'Kijkt hoeveel het hoofd horizontaal en verticaal verplaatst tijdens de kern van de swing. Minder onnodige beweging helpt om de ogen rustiger op de bal te houden.',feedback:'Er is relatief veel hoofdbeweging. Zoek eerst een stabiele basis en rustigere verplaatsing.',drill:'No-stride tee drill',drillText:'3 × 5 swings · hoofd rustig houden van load tot contact.'},
  stride:{label:'Stride',hint:'Controle en herhaalbaarheid van de stap',explanation:'Beoordeelt de voorwaartse stap richting foot plant: hoe gecontroleerd de afstand en landing verlopen ten opzichte van de lichaamspositie.',feedback:'De stride verdient extra aandacht. Werk aan een herhaalbare landing zonder haast.',drill:'Stride & freeze',drillText:'3 × 5 herhalingen · land, bevries, controleer balans en swing dan door.'},
  posture:{label:'Posture',hint:'Houding en rompcontrole door de swing',explanation:'Meet hoe stabiel de romp- en hoofdhoek blijven terwijl de speelster loadt, roteert en richting contact beweegt.',feedback:'De houding verandert te veel door de beweging. Train rotatie vanuit een stabiele atletische positie.',drill:'Posture tee',drillText:'3 × 6 swings · behoud romp- en hoofdhoek richting contact.'},
  front_side:{label:'Front side',hint:'Stabiliteit van voorste been en zijde',explanation:'Kijkt hoe stabiel het voorste been en de voorste heup blijven na de landing. Een stabiele front side kan helpen om rotatie en energieoverdracht te controleren.',feedback:'De front side geeft nog onvoldoende stabiele weerstand. Bouw eerst controle bij de landing.',drill:'Firm front-side drill',drillText:'3 × 5 swings · gecontroleerde landing, daarna rotatie rond een stabiele voorzijde.'},
  balance:{label:'Balance',hint:'Balans vóór, tijdens en na contact',explanation:'Kijkt naar de positie van het lichaamszwaartepunt ten opzichte van de voeten en hoeveel herstelstappen of zijwaartse verplaatsing zichtbaar zijn.',feedback:'De swing eindigt minder stabiel dan gewenst. Maak balans een voorwaarde vóór je snelheid toevoegt.',drill:'Finish & hold',drillText:'3 × 5 swings · eindpositie 2 seconden vasthouden zonder bijstappen.'},
  load_timing:{label:'Load → plant timing',hint:'Tempo en controle richting foot plant',explanation:'Meet de tijdsverhouding tussen het inzetten van de load en het moment waarop de voorste voet plant. Het gaat om ritme en herhaalbaarheid, niet om één perfecte tijd.',feedback:'De timing tussen load en landing kan consistenter. Werk met een rustig ritme en vaste landing.',drill:'Load-pause-go',drillText:'3 × 5 herhalingen · gecontroleerde load, korte pauze, plant en swing.'},
  sequencing:{label:'Sequencing',hint:'Volgorde onderlichaam, romp en handen',explanation:'Schat de volgorde waarin heupen/onderlichaam, romp, schouders en handen versnellen. Bij één camerahoek is dit een indicatie en geen exacte 3D-meting.',feedback:'Onderlichaam, romp en handen starten te veel tegelijk. Train de bewegingsvolgorde op lage snelheid.',drill:'Slow motion sequence',drillText:'3 × 5 langzame swings · heup → romp → schouders → handen/barrel.'},
  hand_connection:{label:'Hand connection',hint:'Handen verbonden met romp en rotatie',explanation:'Kijkt hoe de handen ten opzichte van schouders en romp bewegen. De score zoekt naar een compacte, verbonden handroute zonder vroeg loskomen van de lichaamsrotatie.',feedback:'De handen raken vroeg los van de lichaamsrotatie. Werk aan verbinding en een compacte handroute.',drill:'Connection drill',drillText:'3 × 6 korte tee-swings · handen verbonden houden met de romp.'}
}
function metricObservation(key,value){
  const n=Number(value)
  const info=swingMetricCatalog[key]||{}
  if(!Number.isFinite(n)) return 'Niet betrouwbaar genoeg beoordeeld in deze video.'
  if(n>=82) return `De AI ziet ${info.label?.toLowerCase()||'dit onderdeel'} als relatief stabiel in deze swing.`
  if(n>=68) return `De AI ziet een bruikbare basis, met nog zichtbare ruimte voor meer controle en herhaalbaarheid.`
  if(n>=52) return `De AI ziet hier een duidelijk aandachtspunt. Bekijk dit samen met de video voordat je er coaching aan koppelt.`
  return `De AI ziet hier de grootste afwijking binnen deze swing. Controleer of camerahoek en zichtbaarheid goed waren en beoordeel het daarna als coach.`
}

function formatSwingDate(value){try{return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}catch{return ''}}

function CoachStatsModal({team,players=[],attendance=[],gameAttendance=[],trainingEvents=[],calendarEvents=[],gameStats=[],measurements=[],onPlayer,onAddGame,onAddMeasurement,onClose}){
  const rows=players.map(person=>({person,stats:coreStatsForPlayer(person.id,team,attendance,gameAttendance,trainingEvents,calendarEvents,gameStats,measurements)}))
  const teamGames=gameStats.filter(r=>Number(r.team_id)===Number(team?.id))
  const sum=teamGames.reduce((a,r)=>{['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>a[k]=(a[k]||0)+Number(r[k]||0));return a},{})
  const avg=sum.ab?sum.h/sum.ab:null, den=(sum.ab||0)+(sum.bb||0)+(sum.hbp||0)+(sum.sf||0), obp=den?((sum.h||0)+(sum.bb||0)+(sum.hbp||0))/den:null, slg=sum.ab?(sum.tb||0)/sum.ab:null, ops=obp!=null&&slg!=null?obp+slg:null
  const ev=rows.map(r=>Number(r.stats.exit?.value)).filter(Number.isFinite), h1=rows.map(r=>Number(r.stats.home1?.value)).filter(Number.isFinite), atts=rows.map(r=>r.stats.attendance.percentage).filter(v=>v!=null)
  const cards=[['AVG',statRate(avg)],['OPS',statRate(ops)],['Hits',sum.h||0],['RBI',sum.rbi||0],['SB',sum.sb||0],['Exit velo',ev.length?`${Math.round(ev.reduce((a,b)=>a+b,0)/ev.length)} km/u`:'—'],['Home → 1',h1.length?`${(h1.reduce((a,b)=>a+b,0)/h1.length).toFixed(2).replace('.',',')} s`:'—'],['Aanwezig',atts.length?`${Math.round(atts.reduce((a,b)=>a+b,0)/atts.length)}%`:'—']]
  return <SettingsModal title={`${team?.name||'Team'} stats`} onClose={onClose}><div className="coach-stats-modal">
    <div className="coach-stats-actions"><button className="primary" onClick={onAddGame}>+ Wedstrijd</button><button className="secondary orange-outline" onClick={onAddMeasurement}>+ Meting</button></div>
    <p className="eyebrow orange">TEAMSTATISTIEKEN</p><div className="coach-team-stat-grid">{cards.map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
    <div className="coach-stats-player-head"><strong>Persoonlijke stats</strong><small>Tik op een speelster</small></div>
    <div className="coach-stats-players">{rows.map(({person,stats})=><button key={person.id} onClick={()=>onPlayer(person)}><span className="coach-stats-person"><ProfileAvatar person={person} size="small"/><span><strong>{teamDisplayName(person)}</strong><small>{person.jersey_number?`#${person.jersey_number} · `:''}${person.primary_position||'Geen positie'}</small></span></span><span className="coach-stats-mini"><strong>{statRate(stats.avg)}</strong><small>AVG</small></span><span className="coach-stats-mini"><strong>{stats.attendance.percentage==null?'—':`${stats.attendance.percentage}%`}</strong><small>Aanw.</small></span><Icon name="chevron"/></button>)}</div>
  </div></SettingsModal>
}
function PlayerStatsModal({person,team,attendance=[],gameAttendance=[],trainingEvents=[],calendarEvents=[],gameStats=[],measurements=[],onClose}){
  const s=coreStatsForPlayer(person.id,team,attendance,gameAttendance,trainingEvents,calendarEvents,gameStats,measurements)
  const cards=[['AVG',statRate(s.avg)],['OPS',statRate(s.ops)],['Hits',s.h],['RBI',s.rbi],['SB',s.sb],['Exit velocity',s.exit?`${Number(s.exit.value).toFixed(0)} km/u`:'—'],['Home → 1',s.home1?`${Number(s.home1.value).toFixed(2).replace('.',',')} sec`:'—'],['Aanwezigheid',s.attendance.percentage==null?'—':`${s.attendance.percentage}%`]]
  return <SettingsModal title="Persoonlijke stats" onClose={onClose}><div className="player-stats-coach"><div className="stats-player-strip"><ProfileAvatar person={person} size="small"/><div><strong>{personName(person)}</strong><span>{team?.name}{person.jersey_number?` · #${person.jersey_number}`:''}</span></div></div><div className="stats-eight-grid">{cards.map(([l,v])=><article className="stats-metric-card" key={l}><span>{l}</span><strong>{v}</strong></article>)}</div></div></SettingsModal>
}
function CoachStatEntryModal({mode,team,players=[],onClose,onSaved}){
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('')
  const [playerId,setPlayerId]=useState(players[0]?.id||'')
  const [game,setGame]=useState({date:new Date().toISOString().slice(0,10),opponent:'',ab:'',h:'',rbi:'',bb:'',hbp:'',sf:'',tb:'',sb:''})
  const [metric,setMetric]=useState({type:'exit_velocity',value:'',date:new Date().toISOString().slice(0,10)})
  async function save(){
    if(!playerId)return setFeedback('Kies een speelster.')
    setBusy(true);setFeedback('')
    try{
      if(mode==='game'){
        if(!game.date||!game.opponent.trim())throw new Error('Vul datum en tegenstander in.')
        const key=`manual-${team.id}-${game.date}-${game.opponent.trim().toLowerCase().replace(/\s+/g,'-')}`
        const payload={profile_id:playerId,team_id:Number(team.id),game_key:key,game_date:game.date,opponent:game.opponent.trim(),source:'manual'}
        ;['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>payload[k]=Number(game[k]||0))
        const {error}=await supabase.from('player_game_stats').upsert(payload,{onConflict:'profile_id,game_key'});if(error)throw error
      }else{
        if(!metric.value)throw new Error('Vul een meting in.')
        const {error}=await supabase.from('player_measurements').insert({profile_id:playerId,team_id:Number(team.id),metric_type:metric.type,value:Number(String(metric.value).replace(',','.')),unit:metric.type==='exit_velocity'?'km/u':'sec',measured_at:`${metric.date}T12:00:00`});if(error)throw error
      }
      await onSaved()
    }catch(e){setFeedback(`Opslaan mislukt: ${e.message}`)}finally{setBusy(false)}
  }
  return <SettingsModal title={mode==='game'?'Wedstrijdstats invoeren':'Meting toevoegen'} onClose={onClose}><div className="form-stack coach-stat-entry"><label>Speelster<select value={playerId} onChange={e=>setPlayerId(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>{personName(p)}{p.jersey_number?` (#${p.jersey_number})`:''}</option>)}</select></label>{mode==='game'?<><label>Datum<input type="date" value={game.date} onChange={e=>setGame({...game,date:e.target.value})}/></label><label>Tegenstander<input value={game.opponent} onChange={e=>setGame({...game,opponent:e.target.value})}/></label><div className="stat-entry-grid">{['ab','h','rbi','bb','hbp','sf','tb','sb'].map(k=><label key={k}>{k.toUpperCase()}<input type="number" min="0" value={game[k]} onChange={e=>setGame({...game,[k]:e.target.value})}/></label>)}</div></>:<><label>Type<select value={metric.type} onChange={e=>setMetric({...metric,type:e.target.value})}><option value="exit_velocity">Exit velocity</option><option value="home_to_first">Home → 1</option></select></label><label>Waarde<input inputMode="decimal" value={metric.value} onChange={e=>setMetric({...metric,value:e.target.value})} placeholder={metric.type==='exit_velocity'?'92':'3,21'}/></label><label>Datum<input type="date" value={metric.date} onChange={e=>setMetric({...metric,date:e.target.value})}/></label></>}{feedback&&<div className="push-feedback">{feedback}</div>}<button className="primary" disabled={busy} onClick={save}>{busy?'Opslaan…':'Opslaan'}</button></div></SettingsModal>
}

function PlayerRequestDetailModal({ request, selectedTeam, allTeams = [], profiles = [], candidates = [], onConfirm, onNominate, onClose }) {
  const requestingTeam = allTeams.find(t => Number(t.id) === Number(request.requesting_team_id))
  const targetTeam = allTeams.find(t => Number(t.id) === Number(request.target_team_id))
  const isTargetCoach = Number(selectedTeam?.id) === Number(request.target_team_id)
  const statusLabel = value => value === 'confirmed' ? 'Bevestigd' : value === 'available' ? 'Kan meedoen' : value === 'unavailable' ? 'Kan niet' : 'Uitgenodigd'
  const ordered = [...candidates].sort((a,b) => ['confirmed','available','invited','unavailable'].indexOf(a.response) - ['confirmed','available','invited','unavailable'].indexOf(b.response))
  return <SettingsModal title="Invallerverzoek" onClose={onClose}><div className="request-detail-modal">
    <div className="request-detail-hero"><span className="coach-session-type">{request.status === 'filled' ? 'PLEK INGEVULD' : 'OPEN VERZOEK'}</span><h3>{request.position}</h3><p>{request.event_title}</p><small>{formatLongDate(request.event_start)}</small></div>
    <div className="request-detail-grid"><div><span>Van team</span><strong>{requestingTeam?.name || 'Onbekend team'}</strong></div><div><span>Naar team</span><strong>{targetTeam?.name || 'Onbekend team'}</strong></div><div><span>Aantal nodig</span><strong>{request.slots_needed}</strong></div><div><span>Status</span><strong>{request.status === 'filled' ? 'Ingevuld' : request.status === 'closed' ? 'Gesloten' : 'Open'}</strong></div></div>
    {request.note && <div className="request-detail-note"><span>Opmerking</span><p>{request.note}</p></div>}
    <div className="request-detail-heading"><strong>Speelsters</strong><span>{candidates.length} voorgedragen</span></div>
    <div className="request-detail-candidates">{ordered.length ? ordered.map(candidate => { const person=profiles.find(p=>p.id===candidate.profile_id); return <article key={candidate.id}><span className="request-person"><ProfileAvatar person={person} size="small"/><span><strong>{person?.first_name || personName(person)}</strong><small>{playerSportLine(person)}</small></span></span><span className={`request-status ${candidate.response}`}>{statusLabel(candidate.response)}</span>{candidate.response==='available' && Number(selectedTeam?.id)===Number(request.requesting_team_id) && <button className="mini-action" onClick={()=>onConfirm(candidate)}>Bevestigen</button>}</article> }) : <p className="muted">Er zijn nog geen speelsters voorgedragen.</p>}</div>
    {isTargetCoach && request.status === 'open' && <button className="primary" onClick={onNominate}>Speelsters voordragen</button>}
  </div></SettingsModal>
}

function CoachMessageModal({ session, team, onClose, onSaved, onMessage }) {
  const [busy,setBusy]=useState(false)
  const [feedback,setFeedback]=useState('')
  const [form,setForm]=useState({kind:'general',title:'',body:'',push:true})
  async function send(){
    if(!form.title.trim()||!form.body.trim()) return setFeedback('Vul een titel en bericht in.')
    setBusy(true); setFeedback('')
    try {
      const {error}=await supabase.from('team_messages').insert({team_id:Number(team.id),kind:form.kind,title:form.title.trim(),body:form.body.trim(),created_by:session.user.id,push_sent:false})
      if(error) throw error
      if(form.push){
        const response=await fetch('/api/push/team-message',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({teamId:Number(team.id),title:form.title.trim(),body:form.body.trim()})})
        const payload=await response.json().catch(()=>({}))
        if(!response.ok) throw new Error(payload.error||'Pushmelding kon niet worden verstuurd.')
        setFeedback(payload.sent ? `Bericht geplaatst · push naar ${payload.sent} apparaat${payload.sent===1?'':'en'}.` : 'Bericht geplaatst. Niemand in dit team heeft pushmeldingen ingeschakeld.')
      } else setFeedback('Bericht geplaatst.')
      await onSaved()
    } catch(error) { setFeedback(`Versturen mislukt: ${error.message}`) }
    finally { setBusy(false) }
  }
  return <SettingsModal title="Teambericht" onClose={onClose}><div className="form-stack"><p className="settings-modal-intro">Aan <strong>{team?.name}</strong></p><label>Soort<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="rain">Regen / locatie</option><option value="gear">Speciale spullen</option><option value="change">Wijziging</option><option value="cancel">Annulering</option><option value="general">Algemeen</option></select></label><label>Titel<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Bijv. Neem binnenschoenen mee"/></label><label>Bericht<textarea rows="4" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label><label className="repeat-toggle"><span><strong>Stuur als pushmelding</strong><small>Direct naar spelers van dit team</small></span><input type="checkbox" checked={form.push} onChange={e=>setForm({...form,push:e.target.checked})}/></label>{feedback&&<div className="push-feedback" role="status">{feedback}</div>}<button className="primary" disabled={busy} onClick={send}>{busy?'Versturen…':'Bericht versturen'}</button></div></SettingsModal>
}

function FinalizeAttendanceModal({ event, team, players, attendance, gameAttendance, onClose, onSaved, onMessage }) {
  const isGame=event.type==='game'
  const isPast=new Date(event.start).getTime() < Date.now()
  const key=eventTransportKey(event)
  const initial=Object.fromEntries(players.map(p=>{
    const r=isGame?gameAttendance.find(a=>a.event_key===key&&a.profile_id===p.id):attendance.find(a=>String(a.event_id)===String(event.id)&&a.profile_id===p.id)
    return [p.id,r?.status||'']
  }))
  const [statuses,setStatuses]=useState(initial), [busy,setBusy]=useState(false), [feedback,setFeedback]=useState('')
  async function save(){
    const selectedPlayers=players.filter(p=>statuses[p.id])
    if(!selectedPlayers.length){setFeedback('Kies minimaal voor één speelster een status.');return}
    setBusy(true);setFeedback('')
    try{
      if(isGame){
        const rows=selectedPlayers.map(p=>({event_key:key,team_id:Number(team.id),profile_id:p.id,status:statuses[p.id],event_title:event.title,event_start:event.start,updated_at:new Date().toISOString()}))
        const {error}=await supabase.from('game_attendance').upsert(rows,{onConflict:'event_key,profile_id'}); if(error)throw error
      }else{
        const rows=selectedPlayers.map(p=>({event_id:event.id,profile_id:p.id,status:statuses[p.id],updated_at:new Date().toISOString()}))
        const {error}=await supabase.from('attendance').upsert(rows,{onConflict:'event_id,profile_id'}); if(error)throw error
      }
      setFeedback('Aanwezigheid opgeslagen ✓')
      await onSaved()
      setTimeout(()=>onClose(),350)
    }catch(e){setFeedback(`Opslaan mislukt: ${e.message}`)}finally{setBusy(false)}
  }
  const options=isPast
    ? [['present','Aanwezig'],['absent','Afwezig'],['injured','Geblesseerd'],['late','Te laat']]
    : isGame
      ? [['present','Aanwezig'],['absent','Afwezig']]
      : [['present','Aanwezig'],['maybe','Misschien'],['absent','Afwezig']]
  return <SettingsModal title={isPast?'Aanwezigheid afronden':'Aanwezigheid beheren'} onClose={onClose}><div className="finalize-session-head"><strong>{event.title}</strong><span>{formatLongDate(event.start)} · {team?.name}</span>{!isPast&&<small>Als coach kun je vooraf de status voor speelsters invullen of corrigeren.</small>}</div><div className="finalize-roster">{players.map(p=><article key={p.id}><span className="finalize-person"><ProfileAvatar person={p} size="small"/><span><strong>{p.first_name||personName(p)}</strong>{p.is_placeholder&&<small>Nog geen Mijn OG-account</small>}</span></span><div className="finalize-status-grid">{options.map(([value,label])=><button type="button" key={value} className={statuses[p.id]===value?'active':''} onClick={()=>setStatuses({...statuses,[p.id]:value})}>{label}</button>)}</div></article>)}</div>{feedback&&<div className="push-feedback" role="status">{feedback}</div>}<button className="primary" disabled={busy} onClick={save}>{busy?'Opslaan…':'Registratie opslaan'}</button></SettingsModal>
}

function PlayerRequestModal({ session, team, calendarEvents, trainingEvents, onClose, onSaved, onMessage }) {
  const [busy,setBusy]=useState(false), [otherTeams,setOtherTeams]=useState([]), [feedback,setFeedback]=useState('')
  useEffect(()=>{supabase.from('teams').select('id,name,sport,is_active,seasons(is_active)').eq('is_active',true).then(({data})=>setOtherTeams((data||[]).filter(t=>t.seasons?.is_active!==false&&Number(t.id)!==Number(team.id))))},[team.id])
  const future=[...calendarEvents,...trainingEvents].filter(e=>new Date(e.start)>new Date()).sort((a,b)=>new Date(a.start)-new Date(b.start))
  const teamEvents=future.filter(e=>e.type==='training'?(e.teamIds||[e.teamId]).map(Number).includes(Number(team.id)):eventTeamMatches(e,[team]).includes(Number(team.id)))
  const [form,setForm]=useState({eventKey:'',targetTeamId:'',position:'',slots:'1',note:''})
  function eventKeyFor(e){return e.type==='game'?eventTransportKey(e):`event:${e.id}`}
  async function submit(){
    const ev=teamEvents.find(e=>eventKeyFor(e)===form.eventKey)
    if(!ev||!form.targetTeamId||!form.position.trim())return setFeedback('Kies activiteit, ontvangend team en positie.')
    setBusy(true);setFeedback('')
    try{
      const {data:rpcData,error}=await supabase.rpc('create_player_request',{
        p_requesting_team_id:Number(team.id),
        p_target_team_id:Number(form.targetTeamId),
        p_event_key:form.eventKey,
        p_event_title:ev.title,
        p_event_start:ev.start,
        p_position:form.position.trim(),
        p_slots_needed:Math.max(1,Number(form.slots||1)),
        p_note:form.note.trim()||''
      });if(error)throw error
      const req=Array.isArray(rpcData)?rpcData[0]:rpcData
      if(!req?.id)throw new Error('Verzoek is opgeslagen, maar het verzoek-ID ontbreekt.')
      const response=await fetch('/api/push/coach-request',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({requestId:req.id})})
      const payload=await response.json().catch(()=>({}))
      if(!response.ok) throw new Error(payload.error||'Verzoek is opgeslagen, maar de coachmelding kon niet worden verstuurd.')
      setFeedback(payload.sent?`Verzoek verstuurd naar ${payload.sent} coachapparaat${payload.sent===1?'':'en'}.`:'Verzoek geplaatst. De coaches van dit team hebben push nog niet ingeschakeld.')
      await onSaved()
    }catch(e){setFeedback(`Invallerverzoek mislukt: ${e.message}`)}finally{setBusy(false)}
  }
  return <SettingsModal title="Invaller aanvragen" onClose={onClose}><div className="form-stack"><p className="settings-modal-intro">Stuur het verzoek eerst naar de coach van een ander team. Die coach bepaalt welke speelsters geschikt zijn.</p><label>Activiteit<select value={form.eventKey} onChange={e=>setForm({...form,eventKey:e.target.value})}><option value="">Kies wedstrijd of training</option>{teamEvents.map(e=><option key={eventKeyFor(e)} value={eventKeyFor(e)}>{formatShortDate(e.start)} · {e.title}</option>)}</select></label><label>Verzoek aan team<select value={form.targetTeamId} onChange={e=>setForm({...form,targetTeamId:e.target.value})}><option value="">Kies ander team</option>{otherTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><div className="form-two equal-fields"><label>Positie / rol<input value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="Bijv. SS / 2B"/></label><label>Aantal nodig<input type="number" min="1" max="9" value={form.slots} onChange={e=>setForm({...form,slots:e.target.value})}/></label></div><label>Opmerking<textarea rows="3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Bijv. liefst iemand die rechts gooit"/></label>{feedback&&<div className="push-feedback" role="status">{feedback}</div>}<button className="primary" disabled={busy} onClick={submit}>{busy?'Versturen…':'Verzoek naar coach sturen'}</button></div></SettingsModal>
}

function NominatePlayersModal({ session, request, team, profiles, memberships, onClose, onSaved }) {
  const [selected,setSelected]=useState([]), [busy,setBusy]=useState(false), [feedback,setFeedback]=useState(''), [search,setSearch]=useState('')
  const playerIds=memberships.filter(m=>Number(m.team_id)===Number(team.id)&&m.member_role==='player').map(m=>m.profile_id)
  const candidates=profiles.filter(p=>playerIds.includes(p.id)&&(!search.trim()||`${personName(p)} ${playerSportLine(p)}`.toLowerCase().includes(search.toLowerCase())))
  async function submit(){
    if(!selected.length)return setFeedback('Selecteer minimaal één geschikte speelster.')
    setBusy(true);setFeedback('')
    try{
      const rows=selected.map(profile_id=>({request_id:request.id,profile_id,response:'invited'}))
      const {error}=await supabase.from('player_request_candidates').upsert(rows,{onConflict:'request_id,profile_id'});if(error)throw error
      const response=await fetch('/api/push/player-invite',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({requestId:request.id,profileIds:selected,title:'Uitnodiging om mee te spelen',body:`${request.event_title} · gevraagd: ${request.position}`})})
      const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Uitnodigingen konden niet worden verstuurd.')
      setFeedback(payload.sent?`${selected.length} speelster${selected.length===1?'':'s'} voorgedragen. Push verstuurd.`:`${selected.length} speelster${selected.length===1?'':'s'} voorgedragen. Geen actieve pushinschrijving gevonden.`)
      await onSaved()
    }catch(e){setFeedback(`Voordragen mislukt: ${e.message}`)}finally{setBusy(false)}
  }
  return <SettingsModal title="Speelsters voordragen" onClose={onClose}><div className="form-stack"><p className="settings-modal-intro"><strong>{request.position}</strong> gevraagd voor {request.event_title}. Selecteer alleen speelsters die volgens jou geschikt zijn.</p><label>Zoeken<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Naam, positie of slagzijde"/></label><div className="candidate-select-list">{candidates.map(p=>{const checked=selected.includes(p.id);return <button type="button" key={p.id} className={checked?'selected':''} onClick={()=>setSelected(checked?selected.filter(id=>id!==p.id):[...selected,p.id])}><ProfileAvatar person={p} size="small"/><span><strong>{personName(p)}{p.jersey_number?` · #${p.jersey_number}`:''}</strong><small>{playerSportLine(p)}</small></span><span className="candidate-check">{checked?'✓':'+'}</span></button>})}</div>{feedback&&<div className="push-feedback" role="status">{feedback}</div>}<button className="primary" disabled={busy} onClick={submit}>{busy?'Voordragen…':`Draag ${selected.length||''} speelster${selected.length===1?'':'s'} voor`}</button></div></SettingsModal>
}

function StatsSparkline({ values = [], lowerIsBetter = false }) {
  const clean=values.map(Number).filter(Number.isFinite)
  if(clean.length<2) return <div className="stats-sparkline-empty">Nog te weinig data voor een trend</div>
  const w=180,h=46,p=4,min=Math.min(...clean),max=Math.max(...clean),range=max-min||1
  const pts=clean.map((v,idx)=>{
    const x=p+(idx/(clean.length-1))*(w-p*2)
    const y=h-p-((v-min)/range)*(h-p*2)
    return `${x},${y}`
  }).join(' ')
  return <svg className="stats-sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={pts}/>{clean.map((v,idx)=>{const x=p+(idx/(clean.length-1))*(w-p*2),y=h-p-((v-min)/range)*(h-p*2);return <circle key={idx} cx={x} cy={y} r="2.3"/>})}</svg>
}

function Stats({ profile, teams = [], attendance = [], gameAttendance = [], trainingEvents = [], calendarEvents = [], gameStats = [], measurements = [] }) {
  const [statsView,setStatsView]=useState('overview')
  const ownGames=gameStats.filter(row=>row.profile_id===profile?.id).sort((a,b)=>new Date(a.game_date)-new Date(b.game_date))
  const ownMeasurements=measurements.filter(row=>row.profile_id===profile?.id).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at))
  const sums=ownGames.reduce((acc,row)=>{;['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>acc[k]=(acc[k]||0)+Number(row[k]||0));return acc},{})
  const calcRates=rows=>{
    const x=rows.reduce((acc,row)=>{;['ab','h','rbi','bb','hbp','sf','tb','sb'].forEach(k=>acc[k]=(acc[k]||0)+Number(row[k]||0));return acc},{})
    const avg=x.ab?x.h/x.ab:null
    const den=(x.ab||0)+(x.bb||0)+(x.hbp||0)+(x.sf||0)
    const obp=den?((x.h||0)+(x.bb||0)+(x.hbp||0))/den:null
    const slg=x.ab?(x.tb||0)/x.ab:null
    return {...x,avg,ops:obp!=null&&slg!=null?obp+slg:null}
  }
  const season=calcRates(ownGames)
  const last5=calcRates(ownGames.slice(-5))
  const rolling=ownGames.map((_,idx)=>calcRates(ownGames.slice(0,idx+1)))
  const team=teams.find(t=>t.member_role==='player') || teams[0]
  const att=attendanceStatsForPerson(profile?.id,team,attendance,gameAttendance,trainingEvents,calendarEvents)
  const fmtRate=v=>v==null?'—':Number(v).toFixed(3).replace(/^0/,'')
  const metricSeries=type=>ownMeasurements.filter(r=>r.metric_type===type)
  const exitSeries=metricSeries('exit_velocity')
  const home1Series=metricSeries('home_to_first')
  const exitLatest=exitSeries.at(-1), home1Latest=home1Series.at(-1)
  const exitBest=exitSeries.length?Math.max(...exitSeries.map(r=>Number(r.value))):null
  const home1Best=home1Series.length?Math.min(...home1Series.map(r=>Number(r.value))):null
  const trendText=(current,recent,label)=>{
    if(current==null||recent==null) return 'Nog te weinig data'
    if(label==='AVG'||label==='OPS') return `Laatste 5: ${recent==='—'||recent==null?'—':recent}`
    return `Laatste 5: ${recent}`
  }
  const gameCards=[
    {label:'AVG',value:fmtRate(season.avg),context:`${season.ab||0} AB`,recent:fmtRate(last5.avg),series:rolling.map(r=>r.avg).filter(v=>v!=null)},
    {label:'OPS',value:fmtRate(season.ops),context:`${(season.ab||0)+(season.bb||0)+(season.hbp||0)+(season.sf||0)} PA`,recent:fmtRate(last5.ops),series:rolling.map(r=>r.ops).filter(v=>v!=null)},
    {label:'Hits',value:String(season.h||0),context:`${season.ab||0} AB`,recent:String(last5.h||0),series:ownGames.map(r=>Number(r.h||0))},
    {label:'RBI',value:String(season.rbi||0),context:`${ownGames.length} wedstrijden`,recent:String(last5.rbi||0),series:ownGames.map(r=>Number(r.rbi||0))},
    {label:'SB',value:String(season.sb||0),context:'Gestolen honken',recent:String(last5.sb||0),series:ownGames.map(r=>Number(r.sb||0))}
  ]
  const recentGames=[...ownGames].reverse().slice(0,5)
  return <section className="stats-page stats-growth-page">
    <ScreenHeader title="Mijn stats" />
    <div className="stats-growth-hero">
      <div className="stats-growth-person"><ProfileAvatar person={profile} size="profile"/><div><h2>{personName(profile)}</h2><p>{team?.name || 'Mijn OG'}{profile?.primary_position?` · ${profile.primary_position}`:''}{profile?.jersey_number?` · #${profile.jersey_number}`:''}</p><span>Focus op je eigen ontwikkeling</span></div></div>
      <div className="stats-attendance-summary"><span>Aanwezigheid</span><strong>{att.percentage==null?'—':`${att.percentage}%`}</strong><small>{att.total?`${att.attended} / ${att.total} sessies`:'Nog geen registraties'}</small><div className="stats-attendance-bar"><i style={{width:`${att.percentage||0}%`}}/></div></div>
    </div>

    <div className="stats-tabs-static"><button className={statsView==='overview'?'active':''} onClick={()=>setStatsView('overview')}>Overzicht</button><button className={statsView==='games'?'active':''} onClick={()=>setStatsView('games')}>Wedstrijden</button><button className={statsView==='trends'?'active':''} onClick={()=>setStatsView('trends')}>Trends</button></div>

    {statsView==='overview' && <>
      <section className="stats-section">
        <div className="stats-section-heading"><div><h3>Wedstrijdprestaties</h3><p>{season.ab?`Gebaseerd op ${season.ab} AB`:'Nog geen wedstrijdstats'}</p></div></div>
        <div className="stats-game-grid">{gameCards.map(card=><article className="stats-game-card" key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.context}</small><StatsSparkline values={card.series}/><em>{trendText(card.value,card.recent,card.label)}</em></article>)}</div>
        <div className="stats-growth-message">Kleine stappen tellen. Vergelijk jezelf vooral met je eigen eerdere prestaties.</div>
      </section>
      <section className="stats-section">
        <div className="stats-section-heading"><div><h3>Ontwikkeling</h3><p>Metingen door de tijd</p></div></div>
        <div className="stats-development-grid">
          <article className="stats-development-card"><span>Exit velocity</span><strong>{exitLatest?`${Number(exitLatest.value).toFixed(0)} km/u`:'—'}</strong><small>{exitBest!=null?`Beste: ${exitBest.toFixed(0)} km/u`:'Nog geen metingen'}</small><StatsSparkline values={exitSeries.map(r=>r.value)}/></article>
          <article className="stats-development-card"><span>Home → 1</span><strong>{home1Latest?`${Number(home1Latest.value).toFixed(2).replace('.',',')} sec`:'—'}</strong><small>{home1Best!=null?`Beste: ${home1Best.toFixed(2).replace('.',',')} sec`:'Nog geen metingen'}</small><StatsSparkline values={home1Series.map(r=>r.value)}/></article>
        </div>
      </section>
    </>}

    {statsView==='games' && <section className="stats-section">
      <div className="stats-section-heading"><div><h3>Mijn wedstrijden</h3><p>Alle geregistreerde wedstrijdstats</p></div></div>
      {ownGames.length?<div className="stats-game-history">{[...ownGames].reverse().map(row=><article key={row.id||row.game_key}><div className="stats-game-history-head"><span>{new Date(row.game_date).toLocaleDateString('nl-NL',{day:'numeric',month:'long',year:'numeric'})}</span><strong>{row.opponent||'Wedstrijd'}</strong></div><div className="stats-game-history-values"><span><b>{Number(row.ab||0)}</b> AB</span><span><b>{Number(row.h||0)}</b> H</span><span><b>{Number(row.rbi||0)}</b> RBI</span><span><b>{Number(row.sb||0)}</b> SB</span><span><b>{statRate(Number(row.ab)?Number(row.h||0)/Number(row.ab):null)}</b> AVG</span></div></article>)}</div>:<p className="muted">Nog geen wedstrijdstats ingevoerd.</p>}
    </section>}

    {statsView==='trends' && <>
      <section className="stats-section">
        <div className="stats-section-heading"><div><h3>Slagontwikkeling</h3><p>Seizoenslijn op basis van je wedstrijden</p></div></div>
        <div className="stats-trend-grid"><article><span>AVG</span><strong>{fmtRate(season.avg)}</strong><StatsSparkline values={rolling.map(r=>r.avg).filter(v=>v!=null)}/><small>Laatste 5: {fmtRate(last5.avg)}</small></article><article><span>OPS</span><strong>{fmtRate(season.ops)}</strong><StatsSparkline values={rolling.map(r=>r.ops).filter(v=>v!=null)}/><small>Laatste 5: {fmtRate(last5.ops)}</small></article></div>
      </section>
      <section className="stats-section">
        <div className="stats-section-heading"><div><h3>Fysieke ontwikkeling</h3><p>Vergelijk je metingen met jezelf</p></div></div>
        <div className="stats-development-grid"><article className="stats-development-card"><span>Exit velocity</span><strong>{exitLatest?`${Number(exitLatest.value).toFixed(0)} km/u`:'—'}</strong><StatsSparkline values={exitSeries.map(r=>r.value)}/>{exitSeries.length>1&&<em>Verschil sinds eerste meting: {Number(exitLatest.value)-Number(exitSeries[0].value)>=0?'+':''}{(Number(exitLatest.value)-Number(exitSeries[0].value)).toFixed(0)} km/u</em>}</article><article className="stats-development-card"><span>Home → 1</span><strong>{home1Latest?`${Number(home1Latest.value).toFixed(2).replace('.',',')} sec`:'—'}</strong><StatsSparkline values={home1Series.map(r=>r.value)}/>{home1Series.length>1&&<em>Verschil sinds eerste meting: {(Number(home1Latest.value)-Number(home1Series[0].value)).toFixed(2).replace('.',',')} sec</em>}</article></div>
      </section>
    </>}

    <div className="stats-focus-card"><strong>Focus op jouw groei</strong><p>Geen rankings en geen rode beoordelingen. Elke training en wedstrijd levert informatie op waarmee je jezelf kunt verbeteren.</p></div>
  </section>
}
function attendanceStatsForPerson(personId, team, attendance = [], gameAttendance = [], trainingEvents = [], calendarEvents = []) {
  const finalStatuses = new Set(['present','absent','injured','late'])
  const trainingIds = new Set(
    trainingEvents
      .filter(ev => {
        if (!team) return true
        const ids = ev.teamIds?.length ? ev.teamIds : (ev.teamId != null ? [ev.teamId] : [])
        return ids.map(Number).includes(Number(team.id))
      })
      .map(ev => String(ev.id))
  )
  const gameKeys = new Set(
    calendarEvents
      .filter(ev => !team || eventTeamMatches(ev,[team]).includes(Number(team.id)))
      .map(ev => eventTransportKey(ev))
  )
  const trainingRows = attendance.filter(row =>
    row.profile_id === personId &&
    finalStatuses.has(row.status) &&
    (!team || trainingIds.has(String(row.event_id)))
  )
  const gameRows = gameAttendance.filter(row =>
    row.profile_id === personId &&
    finalStatuses.has(row.status) &&
    (!team || gameKeys.has(row.event_key))
  )
  const rows=[...trainingRows,...gameRows]
  const counts={present:0,absent:0,injured:0,late:0}
  rows.forEach(row=>{ if(counts[row.status] != null) counts[row.status]++ })
  const total=rows.length
  const attended=counts.present+counts.late
  return {...counts,total,attended,missed:counts.absent+counts.injured,percentage:total?Math.round((attended/total)*100):null}
}

function PlayerProfileModal({ person, team, viewerProfile, viewerMembership, attendance = [], gameAttendance = [], trainingEvents = [], calendarEvents = [], gameStats = [], measurements = [], onClose }) {
  const canSeeAttendance = viewerProfile?.id === person?.id || viewerProfile?.role === 'admin' || viewerMembership?.member_role === 'coach'
  const stats = canSeeAttendance ? attendanceStatsForPerson(person?.id, team, attendance, gameAttendance, trainingEvents, calendarEvents) : null
  const canSeePlayerStats = viewerProfile?.id === person?.id || viewerProfile?.role === 'admin' || viewerMembership?.member_role === 'coach'
  const performance = canSeePlayerStats ? coreStatsForPlayer(person?.id,team,attendance,gameAttendance,trainingEvents,calendarEvents,gameStats,measurements) : null
  const secondary=(person?.secondary_positions||[]).filter(Boolean)
  const throwsLabel=person?.throws_hand==='L'?'Links':person?.throws_hand==='R'?'Rechts':'Niet ingevuld'
  const batsLabel=person?.bats_side==='S'?'Switch':person?.bats_side==='L'?'Links':person?.bats_side==='R'?'Rechts':'Niet ingevuld'
  return <SettingsModal title="Spelersprofiel" onClose={onClose}>
    <div className="player-profile-modal">
      <div className="player-profile-hero">
        <ProfileAvatar person={person} size="profile"/>
        <div><p className="eyebrow orange">{team?.name || 'MIJN OG'}</p><h2>{personName(person)}</h2><p>{person?.jersey_number ? `#${person.jersey_number}` : 'Geen rugnummer'}{person?.is_placeholder ? ' · Nog geen Mijn OG-account' : ''}</p></div>
      </div>
      <div className="player-profile-data">
        <div><span>Primaire positie</span><strong>{person?.primary_position || 'Niet ingevuld'}</strong></div>
        <div><span>Secundair</span><strong>{secondary.length ? secondary.join(', ') : 'Niet ingevuld'}</strong></div>
        <div><span>Gooit</span><strong>{throwsLabel}</strong></div>
        <div><span>Slaat</span><strong>{batsLabel}</strong></div>
      </div>
      {canSeePlayerStats && <section className="player-profile-stats-card"><div className="player-attendance-heading"><div><p className="eyebrow orange">STATS</p><h3>Persoonlijke stats</h3></div><span>Seizoen 2026</span></div><div className="player-profile-stats-grid">{[['AVG',statRate(performance.avg)],['OPS',statRate(performance.ops)],['Hits',performance.h],['RBI',performance.rbi],['SB',performance.sb],['Exit velo',performance.exit?`${Number(performance.exit.value).toFixed(0)} km/u`:'—'],['Home → 1',performance.home1?`${Number(performance.home1.value).toFixed(2).replace('.',',')} s`:'—'],['Aanwezig',performance.attendance.percentage==null?'—':`${performance.attendance.percentage}%`]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>}
      {canSeeAttendance && <section className="player-attendance-card">
        <div className="player-attendance-heading"><div><p className="eyebrow orange">AANWEZIGHEID</p><h3>{stats.percentage == null ? 'Nog geen percentage' : `${stats.percentage}%`}</h3></div><span>{stats.total} geregistreerde sessie{stats.total===1?'':'s'}</span></div>
        {stats.total ? <><div className="attendance-progress"><span style={{width:`${stats.percentage}%`}} /></div><div className="player-attendance-grid">
          <div><strong>{stats.present}</strong><span>Aanwezig</span></div>
          <div><strong>{stats.absent}</strong><span>Afwezig</span></div>
          <div><strong>{stats.injured}</strong><span>Geblesseerd</span></div>
          <div><strong>{stats.late}</strong><span>Te laat</span></div>
          <div className="missed"><strong>{stats.missed}</strong><span>Totaal gemist</span></div>
        </div><small className="player-attendance-note">Percentage = Aanwezig + Te laat ten opzichte van alle definitief geregistreerde sessies.</small></> : <p className="muted">Er zijn nog geen definitief geregistreerde trainingen of wedstrijden.</p>}
      </section>}
    </div>
  </SettingsModal>
}

function Team({ session, profile, teams, profiles, memberships, gameStats = [], measurements = [], attendance = [], gameAttendance = [], trainingEvents = [], calendarEvents = [], onSaved, onMessage }) {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [cropRequest, setCropRequest] = useState(null)
  const [busy, setBusy] = useState(false)
  const [playerProfile, setPlayerProfile] = useState(null)

  const membersForTeam = teamId => memberships
    .filter(row => Number(row.team_id) === Number(teamId))
    .map(row => ({ ...row, person: profiles.find(person => person.id === row.profile_id) }))
    .filter(row => row.person)

  async function uploadTeamPhoto(team, file) {
    if (!file) return
    setBusy(true); onMessage('')
    try {
      const blob = file.type === 'image/webp' ? file : await compressImage(file, { maxWidth: 1400, maxHeight: 900, maxBytes: 300 * 1024, square: false })
      const path = `${team.id}/team.webp`
      const { error: uploadError } = await supabase.storage.from('team-images').upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('team-images').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error } = await supabase.rpc('set_team_photo', { target_team_id: Number(team.id), new_url: url })
      if (error) throw error
      onMessage('Teamfoto opgeslagen ✓')
      setSelectedTeam(current => current ? { ...current, team_photo_url: url } : current)
      await onSaved()
    } catch (error) { onMessage(`Teamfoto uploaden mislukt: ${error.message}`) }
    setBusy(false)
  }

  async function uploadMemberAvatar(person, file) {
    if (!file || profile?.role !== 'admin') return
    setBusy(true); onMessage('')
    try {
      const blob = file.type === 'image/webp' ? file : await compressImage(file, { maxWidth: 512, maxHeight: 512, maxBytes: 100 * 1024, square: true })
      const path = `${person.id}/profile.webp`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error } = await supabase.rpc('set_profile_avatar', { target_profile_id: person.id, new_url: url })
      if (error) throw error
      onMessage(`Profielfoto van ${personName(person)} opgeslagen ✓`)
      await onSaved()
    } catch (error) { onMessage(`Profielfoto uploaden mislukt: ${error.message}`) }
    setBusy(false)
  }

  return <section>
    <ScreenHeader title="Mijn team" />
    {teams.length ? <div className="team-grid">{teams.map(team => <button className="team-card clickable-team" key={team.id} onClick={() => setSelectedTeam(team)}>
      <TeamThumb team={team} />
      <div><h2>{team.name}</h2><p>{capitalize(team.sport)} · {translateRole(team.member_role)}</p><small>Bekijk team</small></div>
      <Icon name="chevron" />
    </button>)}</div> : <EmptyState icon="team" title="Nog geen team gekoppeld" text="Een beheerder kan jouw account aan het juiste team koppelen." />}
    <SectionTitle title="Teamgegevens" /><EmptyState icon="stats" title="Nog geen teamstatistieken beschikbaar" text="Teamstats verschijnen hier zodra we een echte statistiekbron koppelen." />
    {cropRequest && <ImageCropModal file={cropRequest.file} shape={cropRequest.kind==='avatar'?'circle':'wide'} onClose={() => setCropRequest(null)} onSave={async blob => { const request=cropRequest; setCropRequest(null); if(request.kind==='avatar') await uploadMemberAvatar(request.person,blob); else await uploadTeamPhoto(request.team,blob) }} />}
    {selectedTeam && <TeamModal team={selectedTeam} currentProfile={profile} currentMembership={teams.find(t => Number(t.id)===Number(selectedTeam.id))} members={membersForTeam(selectedTeam.id)} busy={busy} onTeamPhoto={(team,file) => setCropRequest({ kind:'team', team, file })} onAvatar={(person,file) => setCropRequest({ kind:'avatar', person, file })} onPerson={person => setPlayerProfile({ person, team:selectedTeam })} onClose={() => setSelectedTeam(null)} />}
    {playerProfile && <PlayerProfileModal person={playerProfile.person} team={playerProfile.team} viewerProfile={profile} viewerMembership={teams.find(t=>Number(t.id)===Number(playerProfile.team.id))} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} gameStats={gameStats} measurements={measurements} memberships={memberships} onClose={()=>setPlayerProfile(null)} />}
  </section>
}

function TeamThumb({ team }) {
  return team?.team_photo_url ? <img className="team-thumb-image" src={team.team_photo_url} alt={`Teamfoto ${team.name}`} /> : <span className="soft-icon large"><Icon name="team" /></span>
}


function teamDisplayName(person) {
  if (!person) return 'Onbekend'
  const first=(person.first_name || '').trim()
  const last=(person.last_name || '').trim()
  if (!last) return first || 'Onbekend'
  return `${first ? `${first.charAt(0).toUpperCase()}. ` : ''}${last}`
}

function teamPlayerMeta(person) {
  const number=person?.jersey_number ? `#${person.jersey_number}` : 'Geen rugnummer'
  const position=person?.primary_position || 'Geen positie'
  return `${number} · ${position}`
}

function TeamModal({ team, currentProfile, currentMembership, members, busy, onTeamPhoto, onAvatar, onPerson, onClose }) {
  const players = members.filter(row => row.member_role === 'player')
  const staff = members.filter(row => row.member_role === 'coach' || row.member_role === 'staff')
  const canEditTeamPhoto = currentProfile?.role === 'admin' || currentMembership?.member_role === 'coach'
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target===e.currentTarget) onClose() }}>
    <section className="team-modal" role="dialog" aria-modal="true" aria-label={team.name}>
      <header className="team-modal-hero">
        {team.team_photo_url ? <img src={team.team_photo_url} alt={`Teamfoto ${team.name}`} /> : <div className="team-photo-placeholder"><Icon name="team" /><span>Nog geen teamfoto</span></div>}
        <button className="sheet-icon-button team-close" onClick={onClose}><Icon name="close" /></button>
        {canEditTeamPhoto && <label className="photo-upload-button team-photo-button">{busy ? 'Uploaden…' : 'Teamfoto aanpassen'}<input type="file" accept="image/*" disabled={busy} onChange={e => { const file=e.target.files?.[0]; if(file) onTeamPhoto(team,file); e.target.value='' }} /></label>}
      </header>
      <div className="team-modal-body">
        <div className="team-modal-title"><p className="eyebrow orange">{capitalize(team.sport)}</p><h2>{team.name}</h2></div>
        <TeamPeopleSection title="Staff" rows={staff} admin={currentProfile?.role==='admin'} busy={busy} onAvatar={onAvatar} />
        <TeamPeopleSection title="Spelers" rows={players} admin={currentProfile?.role==='admin'} busy={busy} onAvatar={onAvatar} onPerson={onPerson} canOpenPerson={person => currentProfile?.role==='admin' || currentMembership?.member_role==='coach' || currentProfile?.id===person?.id} />
      </div>
    </section>
  </div>
}

function TeamPeopleSection({ title, rows, admin, busy, onAvatar, onPerson, canOpenPerson }) {
  const displayRows = title === 'Spelers' ? [...rows].sort((a,b) => {
    const an = Number.parseInt(a.person?.jersey_number,10)
    const bn = Number.parseInt(b.person?.jersey_number,10)
    const av = Number.isFinite(an) ? an : Number.MAX_SAFE_INTEGER
    const bv = Number.isFinite(bn) ? bn : Number.MAX_SAFE_INTEGER
    return av - bv || personName(a.person).localeCompare(personName(b.person),'nl')
  }) : rows
  return <section className="team-people-section"><div className="team-people-heading"><h3>{title}</h3><span>{displayRows.length}</span></div>
    {displayRows.length ? <div className={`team-people-grid ${displayRows.length % 2 === 1 ? 'odd-count' : ''}`}>{displayRows.map(row => { const openable=onPerson && canOpenPerson?.(row.person); return <article className={`team-person ${openable?'profile-openable':''}`} key={row.id} onClick={()=>openable&&onPerson(row.person)} role={openable?'button':undefined} tabIndex={openable?0:undefined} onKeyDown={e=>{if(openable&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onPerson(row.person)}}}>
      <div className="team-person-avatar-wrap"><ProfileAvatar person={row.person} size="large" />{admin && <label className="avatar-admin-edit" title="Profielfoto aanpassen" onClick={e=>e.stopPropagation()}><Icon name="edit" /><input type="file" accept="image/*" disabled={busy} onChange={e => { const file=e.target.files?.[0]; if(file) onAvatar(row.person,file); e.target.value='' }} /></label>}</div>
      <strong>{row.member_role==='player' ? teamDisplayName(row.person) : personName(row.person)}</strong>
      <small>{row.member_role==='player' ? teamPlayerMeta(row.person) : translateRole(row.member_role)}</small>
      {openable && <span className="profile-open-hint">Bekijk profiel</span>}
    </article>})}</div> : <div className="admin-empty">Nog geen {title.toLowerCase()} gekoppeld.</div>}
  </section>
}

function AdminPanel({ session, onMessage, onChanged }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu')
  const [seasons, setSeasons] = useState([])
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [memberships, setMemberships] = useState([])
  const [adminPushSubscriptions, setAdminPushSubscriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [seasonForm, setSeasonForm] = useState({ name: '', starts_on: '', ends_on: '' })
  const [teamForm, setTeamForm] = useState({ name: '', sport: 'softbal', season_id: '', foys_match_text: '' })
  const [editingTeamId, setEditingTeamId] = useState(null)
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [inviteForm, setInviteForm] = useState({ first_name: '', last_name: '', email: '', team_id: '', member_role: 'player' })
  const [inviteSent, setInviteSent] = useState(false)
  const [showPlaceholderForm, setShowPlaceholderForm] = useState(false)
  const [placeholderForm, setPlaceholderForm] = useState({ first_name:'', last_name:'', jersey_number:'', primary_position:'', secondary_positions:'', throws_hand:'R', bats_side:'R' })
  const [placeholderFeedback, setPlaceholderFeedback] = useState('')
  const [linkPlayer, setLinkPlayer] = useState(null)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkFeedback, setLinkFeedback] = useState('')
  const [locations, setLocations] = useState([])
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState(null)
  const [locationForm, setLocationForm] = useState({ name:'', address:'', maps_url:'', travel_minutes:'', match_text:'' })

  useEffect(() => {
    if (open) loadAdminData()
  }, [open])

  async function loadAdminData() {
    setLoading(true)
    const [seasonResult, teamResult, profileResult, memberResult, locationResult, pushResult] = await Promise.all([
      supabase.from('seasons').select('*').order('starts_on', { ascending: false }),
      supabase.from('teams').select('id,name,sport,is_active,season_id,foys_match_text,seasons(name,is_active)').order('name'),
      supabase.from('profiles').select('id,first_name,last_name,jersey_number,role,avatar_url,primary_position,secondary_positions,throws_hand,bats_side,is_placeholder').order('first_name'),
      supabase.from('team_members').select('id,team_id,profile_id,member_role'),
      supabase.from('club_locations').select('*').order('name'),
      supabase.from('push_subscriptions').select('profile_id,enabled').eq('enabled', true)
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
    if (locationResult.error) onMessage(`Locaties laden mislukt: ${locationResult.error.message}`)
    else setLocations(locationResult.data ?? [])
    if (pushResult.error) onMessage(`Pushstatus laden mislukt: ${pushResult.error.message}`)
    else setAdminPushSubscriptions(pushResult.data ?? [])
    setLoading(false)
  }

  function closeAdmin() {
    setOpen(false)
    setView('menu')
    setShowSeasonForm(false)
    setShowTeamForm(false)
    setEditingTeamId(null)
    setMemberSearch('')
    setInviteSent(false)
  }

  function goTo(nextView) {
    setView(nextView)
    setShowSeasonForm(false)
    setShowTeamForm(false)
    setEditingTeamId(null)
    setMemberSearch('')
    setInviteSent(false)
    setShowLocationForm(false)
    setEditingLocationId(null)
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

  async function saveTeam(e) {
    e.preventDefault()
    if (!teamForm.name.trim() || !teamForm.season_id) return
    setBusy(true); onMessage('')
    const payload = {
      name: teamForm.name.trim(),
      sport: teamForm.sport,
      season_id: Number(teamForm.season_id),
      foys_match_text: teamForm.foys_match_text.trim() || null,
      is_active: true
    }
    const { error } = editingTeamId
      ? await supabase.from('teams').update(payload).eq('id', editingTeamId)
      : await supabase.from('teams').insert(payload)
    setBusy(false)
    if (error) return onMessage(`Team opslaan mislukt: ${error.message}`)
    setTeamForm({ name: '', sport: 'softbal', season_id: '', foys_match_text: '' })
    setEditingTeamId(null)
    setShowTeamForm(false)
    onMessage(editingTeamId ? 'Team bijgewerkt ✓' : 'Team toegevoegd ✓')
    await loadAdminData()
    onChanged?.()
  }

  function editTeam(team) {
    setEditingTeamId(team.id)
    setTeamForm({
      name: team.name || '',
      sport: team.sport || 'softbal',
      season_id: String(team.season_id || selectedSeasonId || ''),
      foys_match_text: team.foys_match_text || ''
    })
    setShowTeamForm(true)
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

  async function createPlaceholderPlayer(e) {
    e.preventDefault()
    if (!selectedTeamId || !placeholderForm.first_name.trim() || !placeholderForm.last_name.trim()) return
    setBusy(true); setPlaceholderFeedback('')
    try {
      const response = await fetch('/api/admin/player', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body:JSON.stringify({
          ...placeholderForm,
          team_id:Number(selectedTeamId),
          secondary_positions:placeholderForm.secondary_positions.split(',').map(v=>v.trim()).filter(Boolean)
        })
      })
      const payload=await response.json()
      if (!response.ok) throw new Error(payload.error || 'Speler aanmaken mislukt.')
      setPlaceholderForm({ first_name:'', last_name:'', jersey_number:'', primary_position:'', secondary_positions:'', throws_hand:'R', bats_side:'R' })
      setShowPlaceholderForm(false)
      setPlaceholderFeedback('Speelster toegevoegd zonder Mijn OG-account ✓')
      await loadAdminData(); onChanged?.()
    } catch(error) { setPlaceholderFeedback(error.message) }
    setBusy(false)
  }

  async function linkPlaceholderAccount(e) {
    e.preventDefault()
    if (!linkPlayer?.id || !linkEmail.trim()) return
    setBusy(true); setLinkFeedback('')
    try {
      const response = await fetch('/api/admin/link-player', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body:JSON.stringify({ profile_id:linkPlayer.id, email:linkEmail.trim() })
      })
      const payload=await response.json().catch(()=>({}))
      if(!response.ok) throw new Error(payload.error || 'Account koppelen mislukt.')
      setLinkFeedback('E-mailadres gekoppeld. De speelster ontvangt een mail om haar wachtwoord in te stellen ✓')
      await loadAdminData(); onChanged?.()
      setTimeout(()=>{ setLinkPlayer(null); setLinkEmail(''); setLinkFeedback('') }, 900)
    } catch(error) {
      setLinkFeedback(error.message)
    }
    setBusy(false)
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim() || !inviteForm.team_id) return
    setBusy(true); setInviteSent(false); onMessage('')
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          email: inviteForm.email.trim(),
          first_name: inviteForm.first_name.trim(),
          last_name: inviteForm.last_name.trim(),
          team_id: Number(inviteForm.team_id),
          member_role: inviteForm.member_role
        })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Uitnodiging versturen mislukt.')
      setInviteSent(true)
      setInviteForm({ first_name: '', last_name: '', email: '', team_id: inviteForm.team_id, member_role: 'player' })
      onMessage('Uitnodiging verstuurd ✓')
      await loadAdminData()
      onChanged?.()
    } catch (error) { onMessage(error.message) }
    setBusy(false)
  }

  function editLocation(location) {
    setEditingLocationId(location.id)
    setLocationForm({ name:location.name||'', address:location.address||'', maps_url:location.maps_url||'', travel_minutes:location.travel_minutes ?? '', match_text:location.match_text||'' })
    setShowLocationForm(true)
  }

  function newLocation() {
    setEditingLocationId(null)
    setLocationForm({ name:'', address:'', maps_url:'', travel_minutes:'', match_text:'' })
    setShowLocationForm(true)
  }

  async function saveLocation(e) {
    e.preventDefault()
    if (!locationForm.name.trim() || !locationForm.address.trim()) return
    setBusy(true); onMessage('')
    const payload = { name:locationForm.name.trim(), address:locationForm.address.trim(), maps_url:locationForm.maps_url.trim() || null, travel_minutes:locationForm.travel_minutes === '' ? null : Number(locationForm.travel_minutes), match_text:locationForm.match_text.trim() || null, is_active:true, updated_at:new Date().toISOString() }
    const { error } = editingLocationId ? await supabase.from('club_locations').update(payload).eq('id', editingLocationId) : await supabase.from('club_locations').insert(payload)
    setBusy(false)
    if (error) return onMessage(`Locatie opslaan mislukt: ${error.message}`)
    setShowLocationForm(false); setEditingLocationId(null); onMessage('Locatie opgeslagen ✓'); await loadAdminData(); onChanged?.()
  }

  async function toggleLocation(location) {
    setBusy(true); onMessage('')
    const { error } = await supabase.from('club_locations').update({ is_active:!location.is_active, updated_at:new Date().toISOString() }).eq('id', location.id)
    setBusy(false)
    if (error) onMessage(`Locatie wijzigen mislukt: ${error.message}`)
    else { await loadAdminData(); onChanged?.() }
  }

  const seasonTeams = teams.filter(team => !selectedSeasonId || String(team.season_id) === String(selectedSeasonId))
  const selectedTeam = teams.find(team => String(team.id) === String(selectedTeamId))
  const currentMemberships = memberships.filter(row => String(row.team_id) === String(selectedTeamId))
  const currentProfileIds = new Set(currentMemberships.map(row => row.profile_id))
  const adminPushEnabledIds = new Set(adminPushSubscriptions.filter(row => row.enabled !== false).map(row => row.profile_id))
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
        <span className="settings-copy"><strong>Clubbeheer</strong><small>Seizoenen, teams, teamindeling en locaties</small></span>
        <span className="admin-badge">Admin</span>
        <Icon name="chevron" />
      </button>

      {open && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) closeAdmin() }}>
          <section className="club-admin-modal" role="dialog" aria-modal="true" aria-label="Clubbeheer">
            <header className="sheet-header">
              {view !== 'menu' ? <button className="sheet-icon-button" onClick={() => setView('menu')} aria-label="Terug"><Icon name="back" /></button> : <span className="sheet-icon-spacer" />}
              <div><p className="eyebrow orange">BEHEERDER</p><h2>{view === 'menu' ? 'Clubbeheer' : view === 'seasons' ? 'Seizoenen' : view === 'teams' ? 'Teams' : view === 'members' ? 'Teamindeling' : view === 'locations' ? 'Locaties' : 'Lid uitnodigen'}</h2></div>
              <button className="sheet-icon-button" onClick={closeAdmin} aria-label="Sluiten"><Icon name="close" /></button>
            </header>

            {loading ? <div className="subtle-loading">Beheer laden…</div> : (
              <div className="sheet-body">
                {view === 'menu' && (
                  <div className="admin-menu-list">
                    <AdminMenuItem icon="calendar" title="Seizoenen" subtitle={`${seasons.length} seizoen${seasons.length === 1 ? '' : 'en'} · ${seasons.find(s => s.is_active)?.name || 'geen actief seizoen'}`} onClick={() => goTo('seasons')} />
                    <AdminMenuItem icon="team" title="Teams" subtitle={`${teams.filter(t => t.is_active).length} actieve teams`} onClick={() => goTo('teams')} />
                    <AdminMenuItem icon="people" title="Teamindeling" subtitle="Spelers en coaches koppelen" onClick={() => goTo('members')} />
                    <AdminMenuItem icon="pin" title="Locaties" subtitle="Clubadressen, Maps en reistijd" onClick={() => goTo('locations')} />
                    <AdminMenuItem icon="person" title="Lid uitnodigen" subtitle="Nieuw Mijn OG-account per e-mail" onClick={() => goTo('invite')} />
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
                    <SectionTitle title="Teams" action={showTeamForm ? 'Sluiten' : '+ Team'} onAction={() => {
                      if (showTeamForm) {
                        setShowTeamForm(false); setEditingTeamId(null); setTeamForm({ name:'', sport:'softbal', season_id:'', foys_match_text:'' })
                      } else {
                        setEditingTeamId(null); setTeamForm({ name:'', sport:'softbal', season_id:selectedSeasonId, foys_match_text:'' }); setShowTeamForm(true)
                      }
                    }} />
                    {showTeamForm && <form className="sheet-form form-stack" onSubmit={saveTeam}>
                      <label>Teamnaam<input placeholder="Honkbal U21" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name:e.target.value})} required /></label>
                      <div className="admin-form-grid"><label>Sport<select value={teamForm.sport} onChange={e => setTeamForm({...teamForm, sport:e.target.value})}><option value="softbal">Softbal</option><option value="honkbal">Honkbal</option></select></label><label>Seizoen<select value={teamForm.season_id || selectedSeasonId} onChange={e => setTeamForm({...teamForm, season_id:e.target.value})} required>{seasons.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label></div>
                      <label>FOYS herkenning<input value={teamForm.foys_match_text} onChange={e => setTeamForm({...teamForm, foys_match_text:e.target.value})} placeholder="Bijv. U21, HSB 1" /><small className="field-help">Gebruik tekst die letterlijk in de FOYS-wedstrijdnaam voorkomt. Meerdere varianten mag je scheiden met een komma.</small></label>
                      <button className="primary" disabled={busy}>{busy ? 'Opslaan…' : editingTeamId ? 'Team opslaan' : 'Team toevoegen'}</button>
                    </form>}
                    <div className="admin-list">
                      {seasonTeams.map(team => <article className={`admin-row team-admin-row${team.is_active ? '' : ' inactive'}`} key={team.id}><div><strong>{team.name}</strong><small>{capitalize(team.sport)} · {team.is_active ? 'Actief' : 'Gearchiveerd'}</small><small>FOYS: {team.foys_match_text || 'nog niet ingesteld'}</small></div><div className="admin-row-actions"><button className="mini-action" disabled={busy} onClick={() => editTeam(team)}>Aanpassen</button><button className="mini-action" disabled={busy} onClick={() => toggleTeam(team)}>{team.is_active ? 'Archiveren' : 'Activeren'}</button></div></article>)}
                      {!seasonTeams.length && <div className="admin-empty">Geen teams in dit seizoen.</div>}
                    </div>
                  </div>
                )}

                {view === 'locations' && (
                  <div className="admin-block">
                    <div className="admin-toolbar"><div><p className="eyebrow orange">CLUBLOCATIES</p><h3>Locaties & reistijd</h3></div><button className="mini-action" onClick={newLocation}>+ Locatie</button></div>
                    <p className="muted">Reistijd is een indicatie vanaf Onze Gezellen in Haarlem. De Maps-knop opent een actuele route.</p>
                    {showLocationForm && <form className="sheet-form form-stack location-form" onSubmit={saveLocation}><label>Club / locatie<input value={locationForm.name} onChange={e => setLocationForm({...locationForm,name:e.target.value})} placeholder="Bijv. Amsterdam Pirates" required /></label><label>Adres<input value={locationForm.address} onChange={e => setLocationForm({...locationForm,address:e.target.value})} placeholder="Straat, plaats" required /></label><div className="admin-form-grid"><label>Reistijd vanaf OG (min)<input type="number" min="0" value={locationForm.travel_minutes} onChange={e => setLocationForm({...locationForm,travel_minutes:e.target.value})} placeholder="28" /></label><label>Herkenning FOYS<input value={locationForm.match_text} onChange={e => setLocationForm({...locationForm,match_text:e.target.value})} placeholder="Sparks of straatnaam" /></label></div><label>Eigen Google Maps-link (optioneel)<input type="url" value={locationForm.maps_url} onChange={e => setLocationForm({...locationForm,maps_url:e.target.value})} placeholder="https://maps.google.com/..." /></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowLocationForm(false)}>Annuleren</button><button className="primary" disabled={busy}>{busy?'Opslaan…':'Opslaan'}</button></div></form>}
                    <div className="admin-list">{locations.map(location => <article className={`admin-row location-admin-row${location.is_active?'':' inactive'}`} key={location.id}><div><strong>{location.name}</strong><small>{location.address}{location.travel_minutes != null ? ` · ±${formatTravelMinutes(location.travel_minutes)}` : ''}</small>{location.match_text && <small>Herkenning: {location.match_text}</small>}</div><div className="admin-row-actions"><button className="mini-action" onClick={() => editLocation(location)}>Aanpassen</button><button className="mini-action" onClick={() => toggleLocation(location)}>{location.is_active?'Archiveren':'Activeren'}</button></div></article>)}{!locations.length && <div className="admin-empty">Nog geen clublocaties toegevoegd.</div>}</div>
                  </div>
                )}

                {view === 'invite' && (
                  <div className="admin-block">
                    <div className="invite-intro"><p className="eyebrow orange">NIEUW ACCOUNT</p><h3>Nodig een clublid uit</h3><p className="muted">De gebruiker ontvangt een e-mail, kiest zelf een wachtwoord en wordt automatisch aan het gekozen team gekoppeld.</p></div>
                    <form className="sheet-form form-stack" onSubmit={sendInvite}>
                      <div className="admin-form-grid"><label>Voornaam<input value={inviteForm.first_name} onChange={e => setInviteForm({...inviteForm, first_name:e.target.value})} required /></label><label>Achternaam<input value={inviteForm.last_name} onChange={e => setInviteForm({...inviteForm, last_name:e.target.value})} required /></label></div>
                      <label>E-mailadres<input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email:e.target.value})} autoComplete="off" required /></label>
                      <div className="admin-form-grid">
                        <label>Team<select value={inviteForm.team_id} onChange={e => setInviteForm({...inviteForm, team_id:e.target.value})} required><option value="">Kies team</option>{teams.filter(t => t.is_active).map(team => <option key={team.id} value={team.id}>{team.name}{team.seasons?.name ? ` · ${team.seasons.name}` : ''}</option>)}</select></label>
                        <label>Rol<select value={inviteForm.member_role} onChange={e => setInviteForm({...inviteForm, member_role:e.target.value})}><option value="player">Speler</option><option value="coach">Coach</option><option value="staff">Staff</option></select></label>
                      </div>
                      <button className="primary" disabled={busy}>{busy ? 'Uitnodigen…' : 'Uitnodiging versturen'}</button>
                      {inviteSent && <div className="notice success">Uitnodiging verstuurd. Het account verschijnt automatisch in de teamindeling.</div>}
                    </form>
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

                      <div className="player-add-toolbar">
                        <button className="primary compact" type="button" onClick={() => setShowPlaceholderForm(v=>!v)}>+ Speler toevoegen</button>
                      </div>
                      {showPlaceholderForm && <form className="sheet-form form-stack placeholder-player-form" onSubmit={createPlaceholderPlayer}>
                        <div className="placeholder-heading"><div><p className="eyebrow orange">NIEUWE SPEELSTER</p><h3>Zonder Mijn OG-account</h3></div><span className="placeholder-badge">Voorlopig profiel</span></div>
                        <div className="admin-form-grid"><label>Voornaam<input value={placeholderForm.first_name} onChange={e=>setPlaceholderForm({...placeholderForm,first_name:e.target.value})} required /></label><label>Achternaam<input value={placeholderForm.last_name} onChange={e=>setPlaceholderForm({...placeholderForm,last_name:e.target.value})} required /></label></div>
                        <div className="admin-form-grid"><label>Rugnummer<input value={placeholderForm.jersey_number} onChange={e=>setPlaceholderForm({...placeholderForm,jersey_number:e.target.value})} placeholder="12" /></label><label>Primaire positie<input value={placeholderForm.primary_position} onChange={e=>setPlaceholderForm({...placeholderForm,primary_position:e.target.value})} placeholder="SS" /></label></div>
                        <label>Secundaire posities<input value={placeholderForm.secondary_positions} onChange={e=>setPlaceholderForm({...placeholderForm,secondary_positions:e.target.value})} placeholder="2B, 3B" /><small className="field-help">Meerdere posities scheiden met een komma.</small></label>
                        <div className="admin-form-grid"><label>Gooit<select value={placeholderForm.throws_hand} onChange={e=>setPlaceholderForm({...placeholderForm,throws_hand:e.target.value})}><option value="R">Rechts</option><option value="L">Links</option></select></label><label>Slaat<select value={placeholderForm.bats_side} onChange={e=>setPlaceholderForm({...placeholderForm,bats_side:e.target.value})}><option value="R">Rechts</option><option value="L">Links</option><option value="S">Switch</option></select></label></div>
                        <button className="primary" disabled={busy}>{busy?'Aanmaken…':'Speelster aanmaken'}</button>
                        <small className="field-help">Er is geen e-mailadres nodig. Je kunt dit profiel later aan een echt Mijn OG-account koppelen.</small>
                      </form>}
                      {placeholderFeedback && <div className="push-feedback" role="status">{placeholderFeedback}</div>}

                      <SectionTitle title="Huidige teamleden" />
                      <div className="member-list">
                        {currentMemberships.map(membership => {
                          const person = profiles.find(profile => profile.id === membership.profile_id)
                          return <article className="member-row" key={membership.id}>
                            <span className="member-avatar">{initials(person)}</span>
                            <div className="member-copy"><strong>{personName(person)}</strong><small>{person?.jersey_number ? `#${person.jersey_number} · ` : ''}{person?.is_placeholder ? 'Nog geen Mijn OG-account' : person?.role === 'admin' ? 'Clubbeheerder' : 'Mijn OG-lid'}</small>{membership.member_role==='coach' && <span className={`admin-coach-push ${adminPushEnabledIds.has(person?.id)?'active':'inactive'}`}>{adminPushEnabledIds.has(person?.id)?'Meldingen actief':'Meldingen nog niet ingeschakeld'}</span>}{person?.is_placeholder && <button type="button" className="link-account-inline" onClick={()=>{setLinkPlayer(person);setLinkEmail('');setLinkFeedback('')}}>Account koppelen</button>}</div>
                            <select aria-label={`Teamrol van ${personName(person)}`} value={membership.member_role} onChange={e => changeMemberRole(membership.id, e.target.value)} disabled={busy}><option value="player">Speler</option><option value="coach">Coach</option><option value="staff">Staff</option></select>
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
                          <div className="add-member-actions"><button className="mini-action" disabled={busy} onClick={() => addMember(person.id, 'player')}>+ Speler</button><button className="mini-action coach" disabled={busy} onClick={() => addMember(person.id, 'coach')}>+ Coach</button><button className="mini-action" disabled={busy} onClick={() => addMember(person.id, 'staff')}>+ Staff</button></div>
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
      {linkPlayer && <SettingsModal title="Account koppelen" onClose={()=>{setLinkPlayer(null);setLinkEmail('');setLinkFeedback('')}}>
        <form className="form-stack link-player-form" onSubmit={linkPlaceholderAccount}>
          <div className="link-player-identity"><ProfileAvatar person={linkPlayer} size="small"/><div><strong>{personName(linkPlayer)}</strong><small>{playerSportLine(linkPlayer)}</small></div></div>
          <p className="settings-modal-intro">Koppel een echt e-mailadres aan dit bestaande spelersprofiel. Team, rugnummer, historie en andere gegevens blijven behouden.</p>
          <label>E-mailadres<input type="email" autoComplete="email" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)} placeholder="naam@email.nl" required /></label>
          {linkFeedback && <div className="push-feedback" role="status">{linkFeedback}</div>}
          <button className="primary" disabled={busy}>{busy?'Koppelen…':'E-mailadres koppelen'}</button>
        </form>
      </SettingsModal>}
    </>
  )
}

function AdminMenuItem({ icon, title, subtitle, onClick }) {
  return <button className="admin-menu-item" onClick={onClick}><span className="admin-menu-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><Icon name="chevron" /></button>
}

function More({ session, profile, teams, calendar, attendance = [], gameAttendance = [], trainingEvents = [], calendarEvents = [], memberships = [], onSaved, onMessage }) {
  const [icsUrl, setIcsUrl] = useState(calendar?.ics_url ?? '')
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [jerseyNumber, setJerseyNumber] = useState(profile?.jersey_number ?? '')
  const [primaryPosition, setPrimaryPosition] = useState(profile?.primary_position ?? '')
  const [secondaryPositions, setSecondaryPositions] = useState((profile?.secondary_positions ?? []).join(', '))
  const [throwsHand, setThrowsHand] = useState(profile?.throws_hand ?? '')
  const [batsSide, setBatsSide] = useState(profile?.bats_side ?? '')
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [settingsView, setSettingsView] = useState(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarCropFile, setAvatarCropFile] = useState(null)
  const [ownProfileOpen, setOwnProfileOpen] = useState(false)

  useEffect(() => setIcsUrl(calendar?.ics_url ?? ''), [calendar])
  useEffect(() => { setFirstName(profile?.first_name ?? ''); setLastName(profile?.last_name ?? ''); setJerseyNumber(profile?.jersey_number ?? ''); setPrimaryPosition(profile?.primary_position ?? ''); setSecondaryPositions((profile?.secondary_positions ?? []).join(', ')); setThrowsHand(profile?.throws_hand ?? ''); setBatsSide(profile?.bats_side ?? '') }, [profile])

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Naam nog niet ingesteld'
  const teamLine = teams.length ? `${teams.map(team => team.name).join(' · ')}${profile?.jersey_number ? ` · #${profile.jersey_number}` : ''}` : (profile?.jersey_number ? `#${profile.jersey_number}` : 'Nog geen team gekoppeld')

  async function saveProfile() {
    setProfileBusy(true)
    onMessage('')
    const { error } = await supabase.from('profiles').update({ first_name: firstName.trim(), last_name: lastName.trim(), jersey_number: jerseyNumber.trim() || null, primary_position: primaryPosition.trim() || null, secondary_positions: secondaryPositions.split(',').map(v=>v.trim()).filter(Boolean), throws_hand: throwsHand || null, bats_side: batsSide || null }).eq('id', session.user.id)
    setProfileBusy(false)
    if (error) onMessage(`Profiel opslaan mislukt: ${error.message}`)
    else { onMessage('Profiel opgeslagen ✓'); setSettingsView(null); onSaved() }
  }

  function cancelProfileEdit() {
    setFirstName(profile?.first_name ?? '')
    setLastName(profile?.last_name ?? '')
    setSettingsView(null)
  }

  async function sendPasswordReset() {
    setPasswordBusy(true)
    onMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mijn-og-v2.vercel.app'}/`
    })
    setPasswordBusy(false)
    if (error) onMessage(`Resetmail versturen mislukt: ${error.message}`)
    else onMessage('Resetmail verstuurd. Controleer je e-mail.')
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
    else { onMessage('KNBSB-agenda gekoppeld ✓'); setSettingsView(null); onSaved() }
  }

  async function removeCalendar() {
    if (!calendar) return
    setCalendarBusy(true)
    onMessage('')
    const { error } = await supabase.from('calendar_connections').delete().eq('id', calendar.id).eq('profile_id', session.user.id)
    setCalendarBusy(false)
    if (error) onMessage(`Koppeling verwijderen mislukt: ${error.message}`)
    else { setIcsUrl(''); setSettingsView(null); onMessage('KNBSB-agenda ontkoppeld.'); onSaved() }
  }

  async function uploadOwnAvatar(file) {
    if (!file) return
    setAvatarBusy(true)
    onMessage('')
    try {
      const blob = file.type === 'image/webp' ? file : await compressImage(file, { maxWidth: 512, maxHeight: 512, maxBytes: 100 * 1024, square: true })
      const path = `${session.user.id}/profile.webp`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      const { error } = await supabase.rpc('set_profile_avatar', { target_profile_id: session.user.id, new_url: url })
      if (error) throw error
      onMessage('Profielfoto opgeslagen ✓')
      await onSaved()
    } catch (error) { onMessage(`Profielfoto uploaden mislukt: ${error.message}`) }
    setAvatarBusy(false)
  }

  async function signOut() { await supabase.auth.signOut() }

  return (<>
    {avatarCropFile && <ImageCropModal file={avatarCropFile} shape="circle" onClose={() => setAvatarCropFile(null)} onSave={async blob => { setAvatarCropFile(null); await uploadOwnAvatar(blob) }} />}
    <section>
      <ScreenHeader title="Profiel" />

      <article className="profile-card profile-card-with-photo">
        <div className="profile-avatar-control">
          <ProfileAvatar person={profile} size="profile" />
          <label className="avatar-change-button" title="Profielfoto aanpassen"><Icon name="camera" /><input type="file" accept="image/*" disabled={avatarBusy} onChange={e => { const file=e.target.files?.[0]; if(file) setAvatarCropFile(file); e.target.value='' }} /></label>
        </div>
        <div className="profile-copy"><h2>{displayName}</h2><p>{teamLine}</p><div className="profile-inline-actions"><button type="button" className="text-button upload-text" onClick={()=>setOwnProfileOpen(true)}>Bekijk spelersprofiel</button><label className="text-button upload-text">{avatarBusy ? 'Uploaden…' : 'Foto aanpassen'}<input type="file" accept="image/*" disabled={avatarBusy} onChange={e => { const file=e.target.files?.[0]; if(file) setAvatarCropFile(file); e.target.value='' }} /></label></div></div>
        <button className="profile-name-edit" onClick={() => setSettingsView('personal')} aria-label="Naam aanpassen"><Icon name="edit" /> Aanpassen</button>
      </article>

      <PushOnboarding session={session} onOpen={()=>setSettingsView('notifications')} />

      <div className="settings-list">
        <SettingsRow icon="person" title="Persoonlijke gegevens" subtitle={session.user.email} onClick={() => setSettingsView('personal')} />
        <SettingsRow icon="lock" title="Wachtwoord" subtitle="Wachtwoord wijzigen via resetmail" onClick={() => setSettingsView('password')} />
        <SettingsRow icon="bell" title="Meldingen" subtitle="Pushmeldingen instellen" onClick={() => setSettingsView('notifications')} />
        <SettingsRow icon="link" title="Koppelingen" subtitle={calendar ? 'FOYS agenda gekoppeld' : 'FOYS agenda koppelen'} status={calendar ? 'Gekoppeld' : null} onClick={() => setSettingsView('calendar')} />
        <SettingsRow icon="info" title="Over Mijn OG" subtitle="Versie 2.9.7.0" onClick={() => setSettingsView('about')} />
      </div>

      {profile?.role === 'admin' && <AdminPanel session={session} onMessage={onMessage} onChanged={onSaved} />}

      <button className="logout-button" onClick={signOut}><Icon name="logout" /> Uitloggen</button>
    </section>

    {ownProfileOpen && <PlayerProfileModal person={profile} team={null} viewerProfile={profile} viewerMembership={null} attendance={attendance} gameAttendance={gameAttendance} trainingEvents={trainingEvents} calendarEvents={calendarEvents} memberships={memberships} onClose={()=>setOwnProfileOpen(false)} />}
    {settingsView && <SettingsModal title={settingsView === 'personal' ? 'Persoonlijke gegevens' : settingsView === 'password' ? 'Wachtwoord' : settingsView === 'notifications' ? 'Meldingen' : settingsView === 'calendar' ? 'Koppelingen' : 'Over Mijn OG'} onClose={() => { if (settingsView === 'personal') { setFirstName(profile?.first_name ?? ''); setLastName(profile?.last_name ?? '') } setSettingsView(null) }}>
      {settingsView === 'personal' && <div className="form-stack">
        <p className="settings-modal-intro">Pas hier je naam aan. Je e-mailadres blijft gekoppeld aan je account.</p>
        <label>Voornaam<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" /></label>
        <label>Achternaam<input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" /></label>
        <div className="form-two equal-fields"><label>Rugnummer<input value={jerseyNumber} onChange={e=>setJerseyNumber(e.target.value)} placeholder="Bijv. 18" /></label><label>Primaire positie<input value={primaryPosition} onChange={e=>setPrimaryPosition(e.target.value)} placeholder="Bijv. OF" /></label></div>
        <label>Secundaire posities<input value={secondaryPositions} onChange={e=>setSecondaryPositions(e.target.value)} placeholder="Bijv. 2B, SS" /></label>
        <div className="form-two equal-fields"><label>Gooit<select value={throwsHand} onChange={e=>setThrowsHand(e.target.value)}><option value="">Niet ingesteld</option><option value="R">Rechts</option><option value="L">Links</option></select></label><label>Slaat<select value={batsSide} onChange={e=>setBatsSide(e.target.value)}><option value="">Niet ingesteld</option><option value="R">Rechts</option><option value="L">Links</option><option value="S">Switch</option></select></label></div>
        <label>E-mailadres<input value={session.user.email || ''} disabled /></label>
        <button className="primary" onClick={saveProfile} disabled={profileBusy}>{profileBusy ? 'Opslaan…' : 'Opslaan'}</button>
        <button className="secondary" onClick={cancelProfileEdit}>Annuleren</button>
      </div>}

      {settingsView === 'password' && <div className="settings-modal-stack">
        <p className="settings-modal-intro">We sturen een beveiligde resetlink naar <strong>{session.user.email}</strong>. Via die link kies je een nieuw wachtwoord.</p>
        <button className="primary" onClick={sendPasswordReset} disabled={passwordBusy}>{passwordBusy ? 'Versturen…' : 'Stuur resetmail'}</button>
      </div>}

      {settingsView === 'notifications' && <PushSettings session={session} profile={profile} onMessage={onMessage} />}

      {settingsView === 'calendar' && <div className="form-stack">
        <p className="settings-modal-intro">Je persoonlijke FOYS-link is alleen voor jouw account en vult jouw KNBSB-wedstrijden in de agenda.</p>
        <label>Persoonlijke ICS-link<textarea rows="4" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://api.foys.io/competition/public-api/v1/persons/.../ics" /></label>
        <button className="primary" onClick={saveCalendar} disabled={calendarBusy}>{calendarBusy ? 'Opslaan…' : calendar ? 'Koppeling bijwerken' : 'Agenda koppelen'}</button>
        {calendar && <button className="danger-link" onClick={removeCalendar} disabled={calendarBusy}>Koppeling verwijderen</button>}
      </div>}

      {settingsView === 'about' && <div className="about-settings">
        <img src="/og-logo.png" alt="Onze Gezellen" />
        <p className="eyebrow orange">MIJN OG</p>
        <h3>Versie 2.9.7.0</h3>
        <p>De persoonlijke clubomgeving voor teams, trainingen, aanwezigheid, agenda en meldingen.</p>
        <div className="about-version-row"><span>Pushmeldingen</span><strong>Actief</strong></div>
        <div className="about-version-row"><span>FOYS agenda</span><strong>{calendar ? 'Gekoppeld' : 'Niet gekoppeld'}</strong></div>
      </div>}
    </SettingsModal>}
  </>)
}

function SettingsModal({ title, onClose, children }) {
  return <div className="settings-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className="settings-modal" role="dialog" aria-modal="true" aria-label={title}>
      <header className="settings-modal-header"><h2>{title}</h2><button type="button" className="sheet-icon-button" onClick={onClose} aria-label="Sluiten"><Icon name="close" /></button></header>
      <div className="settings-modal-body">{children}</div>
    </section>
  </div>
}

function PushSettings({ session, profile, onMessage }) {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState('default')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pushFeedback, setPushFeedback] = useState('')
  const [installed, setInstalled] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(canPush)
    setPermission(canPush ? Notification.permission : 'unsupported')
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
    const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    setInstalled(!isiOS || standalone)
    if (!canPush) return
    navigator.serviceWorker.register('/sw.js').then(async registration => {
      const subscription = await registration.pushManager.getSubscription()
      setEnabled(Boolean(subscription))
    }).catch(() => setSupported(false))
  }, [])

  async function enablePush() {
    if (!supported) return
    if (!installed) {
      onMessage('Voeg Mijn OG op iPhone eerst toe aan je beginscherm en open de app daarna vanaf het icoon.')
      return
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      onMessage('De publieke push-sleutel ontbreekt in Vercel.')
      return
    }
    setBusy(true); onMessage('')
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') throw new Error('Meldingstoestemming is niet gegeven.')
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      }
      const json = subscription.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({
        profile_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        user_agent: navigator.userAgent,
        enabled: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })
      if (error) throw error
      setEnabled(true)
      onMessage('Pushmeldingen zijn ingeschakeld.')
    } catch (error) {
      onMessage(`Pushmeldingen inschakelen mislukt: ${error.message}`)
    } finally { setBusy(false) }
  }

  async function disablePush() {
    setBusy(true); onMessage('')
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js') || await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('profile_id', session.user.id).eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      } else {
        await supabase.from('push_subscriptions').delete().eq('profile_id', session.user.id)
      }
      setEnabled(false)
      onMessage('Pushmeldingen zijn uitgeschakeld.')
    } catch (error) { onMessage(`Uitschakelen mislukt: ${error.message}`) }
    finally { setBusy(false) }
  }

  async function sendTest() {
    setTesting(true); setPushFeedback('Serverpush wordt verstuurd…'); onMessage('')
    try {
      const response = await fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Testmelding kon niet worden verstuurd.')
      const text = payload.sent ? 'Testmelding verstuurd.' : 'Geen actieve pushinschrijving gevonden.'
      setPushFeedback(text)
    } catch (error) { const text = `Testmelding mislukt: ${error.message}`; setPushFeedback(text); onMessage(text) }
    finally { setTesting(false) }
  }


  return <section className="notification-panel settings-popup-content">
    <p className="settings-modal-intro">Ontvang herinneringen over trainingen en aanwezigheid.</p>
    {!supported ? <div className="push-callout"><strong>Niet ondersteund</strong><p>Deze browser ondersteunt web-push niet.</p></div> : !installed ? <div className="push-callout"><strong>Installeer Mijn OG eerst</strong><p>Open Safari → Deel → Zet op beginscherm. Open Mijn OG daarna via het nieuwe icoon.</p></div> : <>
      <div className="push-status"><span className={`push-status-mark ${enabled ? 'on' : ''}`}><Icon name="bell" /></span><div><strong>{enabled ? 'Meldingen ingeschakeld' : 'Meldingen uitgeschakeld'}</strong><small>Toestemming: {translateNotificationPermission(permission)}</small></div></div>
      <div className="push-actions">
        {!enabled ? <button type="button" className="primary" onClick={enablePush} disabled={busy}>{busy ? 'Inschakelen…' : 'Meldingen inschakelen'}</button> : <button type="button" className="secondary" onClick={disablePush} disabled={busy}>{busy ? 'Uitschakelen…' : 'Meldingen uitschakelen'}</button>}
        {enabled && profile?.role === 'admin' && <button type="button" className="secondary" onClick={sendTest} disabled={testing}>{testing ? 'Versturen…' : 'Stuur testmelding naar mij'}</button>}
      </div>
      {pushFeedback && <div className="push-feedback" role="status" aria-live="polite">{pushFeedback}</div>}
      <div className="push-info-list"><div><strong>Trainingen</strong><span>Belangrijke herinneringen en wijzigingen.</span></div><div><strong>Misschien</strong><span>24 uur voor aanvang een verzoek om definitief te kiezen.</span></div></div>
    </>}
  </section>
}



function NotificationInbox({ messages = [], teams = [], onClose }) {
  const teamMap = Object.fromEntries(teams.map(t => [String(t.id), t.name]))
  return <div className="settings-modal-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) onClose() }}><section className="settings-modal notification-inbox" role="dialog" aria-modal="true"><header className="settings-modal-header"><h2>Meldingen</h2><button className="sheet-icon-button" onClick={onClose}><Icon name="close"/></button></header><div className="settings-modal-body">{messages.length ? <div className="inbox-list">{messages.map(msg => <article key={msg.id}><span className="news-icon"><Icon name={messageIcon(msg.kind)}/></span><div><strong>{msg.title}</strong><p>{msg.body}</p><small>{teamMap[String(msg.team_id)] || 'Mijn OG'} · {formatMessageDate(msg.created_at)}</small></div></article>)}</div> : <EmptyState icon="bell" title="Geen meldingen" text="Nieuwe teamberichten verschijnen hier." />}</div></section></div>
}

function TeamMessageComposer({ session, teams, onSaved, onMessage }) {
  const eligible = teams.filter(t => t.member_role === 'coach')
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false), [feedback,setFeedback]=useState('')
  const [form,setForm]=useState({team_id:String((eligible[0]||teams[0])?.id||''),kind:'general',title:'',body:'',push:true})
  if (!teams.length) return null
  async function send(){
    if(!form.team_id || !form.title.trim() || !form.body.trim()) return onMessage('Vul team, titel en bericht in.')
    setBusy(true)
    const {error}=await supabase.from('team_messages').insert({team_id:Number(form.team_id),kind:form.kind,title:form.title.trim(),body:form.body.trim(),created_by:session.user.id,push_sent:false})
    if(error){setBusy(false);return onMessage(error.message)}
    if(form.push){ try { await fetch('/api/push/team-message',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({teamId:Number(form.team_id),title:form.title.trim(),body:form.body.trim()})}) } catch {} }
    setBusy(false);setOpen(false);setForm(v=>({...v,title:'',body:''}));await onSaved()
  }
  return <><button className="settings-row" onClick={()=>setOpen(true)}><span className="settings-icon"><Icon name="bell"/></span><span className="settings-copy"><strong>Teambericht plaatsen</strong><small>Regen, spullen, wijzigingen of annulering</small></span><Icon name="chevron"/></button>{open&&<SettingsModal title="Nieuw teambericht" onClose={()=>setOpen(false)}><div className="form-stack"><label>Aan<select value={form.team_id} onChange={e=>setForm({...form,team_id:e.target.value})}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Soort<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="rain">Regen / locatie</option><option value="gear">Speciale spullen</option><option value="change">Wijziging</option><option value="cancel">Annulering</option><option value="general">Algemeen</option></select></label><label>Titel<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Bericht<textarea rows="4" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label><label className="repeat-toggle"><span><strong>Stuur als pushmelding</strong><small>Spelers ontvangen dit direct op hun telefoon</small></span><input type="checkbox" checked={form.push} onChange={e=>setForm({...form,push:e.target.checked})}/></label><button className="primary" disabled={busy} onClick={send}>{busy?'Versturen…':'Bericht plaatsen'}</button></div></SettingsModal>}</>
}

function TrainingOverview({ events = [], attendance = [], profiles = [], memberships = [], onClose }) {
  const upcoming = events.slice().sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,20)
  return <div className="settings-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="settings-modal training-overview-modal"><header className="settings-modal-header"><h2>Centraal trainingsoverzicht</h2><button className="sheet-icon-button" onClick={onClose}><Icon name="close"/></button></header><div className="settings-modal-body"><p className="settings-modal-intro">Alle komende trainingen en direct hoeveel spelers aanwezig zijn.</p><div className="overview-list">{upcoming.map(ev=>{const rows=attendance.filter(a=>String(a.event_id)===String(ev.id));const yes=rows.filter(a=>a.status==='present').length;const maybe=rows.filter(a=>a.status==='maybe').length;const memberIds=new Set(memberships.filter(m=>(ev.teamIds||[ev.teamId]).map(String).includes(String(m.team_id))).map(m=>m.profile_id));return <article key={ev.id}><div><strong>{ev.title}</strong><span>{formatShortDate(ev.start)} · {formatTimeRange(ev.start,ev.end)}</span><small>{(ev.teams||[]).map(t=>t.name).join(' · ') || ev.location || 'Training'}</small></div><div className="overview-counts"><strong>{yes}/{memberIds.size || '–'}</strong><span>aanwezig</span>{maybe>0&&<small>{maybe} misschien</small>}</div></article>})}{!upcoming.length&&<p className="muted">Geen trainingen gevonden.</p>}</div></div></section></div>
}
function messageIcon(kind){ return kind==='rain'?'cloud':kind==='gear'?'trophy':kind==='cancel'?'close':kind==='change'?'clock':'bell' }
function formatMessageDate(value){ if(!value)return ''; return new Date(value).toLocaleString('nl-NL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }

function eventTransportKey(event) {
  if (!event) return ''
  if (event.type === 'game') return `foys:${event.uid || `${event.title}|${event.start}`}`
  return `event:${event.id}`
}

function findTransportEvent(event, transportEvents = []) {
  const key = eventTransportKey(event)
  return transportEvents.find(row => row.event_key === key) || null
}

function getTransportSummary(transportEvent, responses = []) {
  if (!transportEvent) return { seats:0, passengers:0, shortage:0, surplus:0 }
  const rows = responses.filter(row => row.event_key === transportEvent.event_key)
  const seats = rows.filter(row => row.mode === 'driver').reduce((sum,row) => sum + Number(row.seats_available || 0), 0)
  const passengers = rows.filter(row => row.mode === 'passenger').length
  return { seats, passengers, shortage:Math.max(0, passengers-seats), surplus:Math.max(0,seats-passengers), rows }
}

function transportStatusLabel(transportEvent, responses) {
  if (!transportEvent) return 'Nog niet ingesteld'
  const summary = getTransportSummary(transportEvent, responses)
  if (summary.shortage > 0) return `! ${summary.shortage} plekken tekort`
  if (summary.passengers === 0 && summary.seats === 0) return 'Nog geen reacties'
  return `Vervoer geregeld · ${summary.seats} plekken`
}

function TransportInlineStatus({ transportEvent, responses }) {
  const summary = getTransportSummary(transportEvent, responses)
  return <div className={`transport-inline ${summary.shortage > 0 ? 'shortage' : 'ok'}`}><Icon name="car"/><strong>{summary.shortage > 0 ? `${summary.shortage} PLEKKEN NODIG` : (summary.passengers || summary.seats ? 'VERVOER GEREGELD' : 'VERVOER')}</strong></div>
}

function matchClubLocation(event, locations = []) {
  const haystack = `${event?.title || ''} ${event?.location || ''}`.toLowerCase()
  return locations.find(location => {
    const needles = [location.match_text, location.address, location.name].filter(Boolean).map(value => String(value).toLowerCase())
    return needles.some(needle => needle.length >= 4 && haystack.includes(needle))
  }) || null
}

function formatTravelMinutes(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n)) return ''
  if (n < 60) return `${n} min`
  const hours = Math.floor(n/60)
  const mins = n%60
  return `${hours} uur${mins ? ` ${mins} min` : ''}`
}

function googleMapsRouteUrl(location, fallbackDestination='') {
  if (location?.maps_url) return location.maps_url
  const origin = encodeURIComponent('Onze Gezellen, Van der Aartweg 16, Haarlem')
  const destination = encodeURIComponent(location?.address || fallbackDestination || '')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
}

function LocationTravelCard({ location, fallbackDestination }) {
  if (!location && !fallbackDestination) return null
  return <div className="location-travel-card"><div><Icon name="pin"/><span><strong>{location?.name || 'Locatie'}</strong><small>{location?.address || fallbackDestination}</small>{location?.travel_minutes != null && <small>± {formatTravelMinutes(location.travel_minutes)} vanaf Onze Gezellen</small>}</span></div><a className="mini-action" href={googleMapsRouteUrl(location, fallbackDestination)} target="_blank" rel="noreferrer">Open in Google Maps</a></div>
}

function inferTransportTeam(event, teams = []) {
  if (!teams.length) return null
  const text = `${event?.title || ''} ${event?.description || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  const scored = teams.map(team => {
    const name = String(team.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const tokens = name.split(/\s+/).filter(token => token.length >= 2 && !['onze','gezellen','og','team'].includes(token))
    const score = tokens.reduce((sum, token) => sum + (text.includes(token) ? token.length : 0), 0)
    return { team, score }
  }).sort((a,b) => b.score-a.score)
  if (scored[0]?.score > 0) return scored[0].team
  return teams.length === 1 ? teams[0] : teams[0]
}

function TransportModal({ event, profile, teams, profiles, memberships, transportEvent, responses, onChanged, onClose }) {
  const key = eventTransportKey(event)
  const inferredTeam = inferTransportTeam(event, teams)
  const [config, setConfig] = useState(transportEvent)
  const [setupError, setSetupError] = useState('')
  const [busy, setBusy] = useState(false)
  const ownResponse = responses.find(row => row.event_key === key && row.profile_id === profile.id)
  const [mode, setMode] = useState(ownResponse?.mode || '')
  const [seats, setSeats] = useState(ownResponse?.seats_available || 3)
  const [note, setNote] = useState(ownResponse?.note || '')

  useEffect(() => {
    let cancelled = false
    async function ensureTransportEvent() {
      if (config || !inferredTeam?.id) return
      const payload = { event_key:key, title:event.title, starts_at:event.start, team_id:Number(inferredTeam.id), location_id:null, created_by:profile.id, updated_at:new Date().toISOString() }
      const { data, error } = await supabase.from('transport_events').upsert(payload, { onConflict:'event_key' }).select('*').single()
      if (cancelled) return
      if (error) setSetupError('Vervoer kon niet automatisch worden geopend. Voer eerst de v2.7.3 Supabase-update uit.')
      else { setConfig(data); await onChanged?.() }
    }
    ensureTransportEvent()
    return () => { cancelled = true }
  }, [config, inferredTeam?.id, key])

  // Wedstrijden gebruiken de FOYS/team-match als bron van waarheid. Een oude
  // transport_events.team_id mag nooit spelers van een ander team meenemen.
  const matchedTeamIds = event.type === 'game' ? eventTeamMatches(event, teams) : []
  const matchedTeam = matchedTeamIds.length === 1 ? teams.find(team => Number(team.id) === Number(matchedTeamIds[0])) : null
  const teamId = matchedTeam?.id || config?.team_id || inferredTeam?.id
  const teamMemberships = teamId ? memberships.filter(row => String(row.team_id) === String(teamId)) : []
  const eligibleIds = new Set(teamMemberships.filter(row => row.member_role === 'player').map(row => row.profile_id))
  const eventResponses = responses.filter(row => row.event_key === key && eligibleIds.has(row.profile_id))
  const summary = getTransportSummary(config, eventResponses)
  const responseIds = new Set(eventResponses.map(row => row.profile_id))
  const noResponseIds = [...eligibleIds].filter(id => !responseIds.has(id))

  useEffect(() => {
    if (!config?.id || !matchedTeam?.id || Number(config.team_id) === Number(matchedTeam.id)) return
    let cancelled = false
    async function repairTransportTeam() {
      const { data, error } = await supabase.from('transport_events').update({ team_id:Number(matchedTeam.id), updated_at:new Date().toISOString() }).eq('id',config.id).select('*').single()
      if (!cancelled && !error && data) { setConfig(data); await onChanged?.() }
    }
    repairTransportTeam()
    return () => { cancelled = true }
  }, [config?.id, config?.team_id, matchedTeam?.id])

  async function saveResponse(nextMode=mode) {
    if (!config || !nextMode || !eligibleIds.has(profile.id)) return
    setBusy(true)
    const payload = { event_key:key, profile_id:profile.id, mode:nextMode, seats_available:nextMode === 'driver' ? Number(seats || 0) : 0, note:note.trim() || null, updated_at:new Date().toISOString() }
    const { error } = await supabase.from('transport_responses').upsert(payload, { onConflict:'event_key,profile_id' })
    setBusy(false)
    if (!error) { setMode(nextMode); await onChanged?.() }
  }

  return <div className="transport-modal-layer" onMouseDown={e => { if(e.target===e.currentTarget) onClose() }}><section className="transport-modal" role="dialog" aria-modal="true"><header className="detail-modal-header"><div><p className="eyebrow orange">VERVOER</p><h2>{event.title}</h2></div><button className="sheet-icon-button" onClick={onClose}><Icon name="close"/></button></header><div className="transport-modal-body">{event.location && <LocationTravelCard location={null} fallbackDestination={event.location}/>} {setupError ? <div className="transport-alert shortage"><strong>{setupError}</strong></div> : !config ? <div className="admin-empty spacious">Vervoersoverzicht laden…</div> : <><div className={`transport-alert ${summary.shortage > 0 ? 'shortage' : 'ok'}`}>{summary.shortage > 0 ? <><strong>NOG {summary.shortage} PLEKKEN NODIG</strong><span>{summary.passengers} personen willen meerijden · {summary.seats} plekken beschikbaar</span></> : <><strong>{summary.passengers || summary.seats ? 'VERVOER GEREGELD' : 'VERVOER NOG OPEN'}</strong><span>{summary.passengers} meerijders · {summary.seats} plekken beschikbaar{summary.surplus > 0 ? ` · ${summary.surplus} plekken over` : ''}</span></>}</div><div className="transport-choice"><h3>Wat doe jij?</h3><button className={mode==='driver'?'active':''} onClick={() => setMode('driver')}><Icon name="car"/> Ik rijd</button><button className={mode==='passenger'?'active':''} onClick={() => saveResponse('passenger')}>Ik rijd mee</button><button className={mode==='self'?'active':''} onClick={() => saveResponse('self')}>Eigen vervoer</button></div>{mode==='driver' && <div className="driver-form"><label>Beschikbare passagiersplekken<div className="seat-stepper"><button type="button" onClick={() => setSeats(Math.max(0,Number(seats)-1))}>−</button><strong>{seats}</strong><button type="button" onClick={() => setSeats(Math.min(20,Number(seats)+1))}>+</button></div></label><label>Opmerking (optioneel)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Bijv. vertrek vanaf clubhuis" /></label><button className="primary" onClick={() => saveResponse('driver')} disabled={busy}>{busy?'Opslaan…':'Ik rijd opslaan'}</button></div>}<TransportPeopleOverview responses={eventResponses} profiles={profiles} noResponseIds={noResponseIds} showNoResponse={true}/></>}</div></section></div>
}

function TransportPeopleOverview({ responses, profiles, noResponseIds, showNoResponse }) {
  const map = Object.fromEntries(profiles.map(p => [p.id,p]))
  const groups = { driver:[], passenger:[], self:[] }
  responses.forEach(row => groups[row.mode]?.push(row))
  return <div className="transport-people"><div><h3>Bestuurders</h3>{groups.driver.length ? groups.driver.map(row => <p key={row.profile_id}>{personName(map[row.profile_id])} · {row.seats_available} plekken{row.note ? ` · ${row.note}` : ''}</p>) : <p className="muted">Nog geen bestuurders.</p>}</div><div><h3>Meerijders</h3>{groups.passenger.length ? groups.passenger.map(row => <p key={row.profile_id}>{personName(map[row.profile_id])}</p>) : <p className="muted">Nog niemand.</p>}</div><div><h3>Eigen vervoer</h3>{groups.self.length ? groups.self.map(row => <p key={row.profile_id}>{personName(map[row.profile_id])}</p>) : <p className="muted">Nog niemand.</p>}</div>{showNoResponse && <div><h3>Nog geen reactie</h3>{noResponseIds.length ? noResponseIds.map(id => <p key={id}>{personName(map[id])}</p>) : <p className="muted">Iedereen heeft gereageerd.</p>}</div>}</div>
}

function translateNotificationPermission(value) {
  return { granted: 'toegestaan', denied: 'geblokkeerd', default: 'nog niet gevraagd', unsupported: 'niet ondersteund' }[value] || value
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
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
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></>,
    car: <><path d="M5 17h14l-1-6-2-4H8l-2 4-1 6Z"/><path d="M7 11h10M5 14h14"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 9h8M8 13h8M8 17h5"/></>,
    swing: <><path d="M4 19 18 5"/><path d="m15 4 5 5"/><path d="M5.5 16.5 8 19"/><circle cx="6" cy="6" r="2.2"/><path d="M9 14c-2-1.4-3.3-3.2-3-5"/></>
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.more}</svg>
}

function iconNameForTab(tab) {
  return { Home: 'home', Agenda: 'calendar', Stats: 'stats', Coach: 'clipboard', Team: 'team', Meer: 'more' }[tab]
}

function translateRole(role) {
  return { player: 'speler', coach: 'coach', staff: 'staff', admin: 'beheerder' }[role] || role || 'lid'
}

function capitalize(value = '') { return value ? value.charAt(0).toUpperCase() + value.slice(1) : '' }



function ImageCropModal({ file, shape='circle', onClose, onSave }) {
  const [url, setUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({x:0,y:0})
  const [drag, setDrag] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { const next=URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next) }, [file])
  function move(e) { if(!drag) return; setOffset({x:drag.ox + e.clientX-drag.x, y:drag.oy + e.clientY-drag.y}) }
  async function save() { setBusy(true); try { const blob=await cropImageFile(file,{shape,zoom,offset,maxBytes:shape==='circle'?100*1024:300*1024}); await onSave(blob) } finally { setBusy(false) } }
  return <div className="modal-backdrop crop-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) onClose() }}><section className="crop-modal"><header><div><p className="eyebrow orange">FOTO AANPASSEN</p><h2>{shape==='circle'?'Profielfoto uitlijnen':'Teamfoto uitlijnen'}</h2></div><button className="sheet-icon-button" onClick={onClose}><Icon name="close"/></button></header><div className={`crop-stage ${shape}`} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag({x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y}) }} onPointerMove={move} onPointerUp={() => setDrag(null)}>{url && <img src={url} alt="Foto uitsnijden" draggable="false" style={{transform:`translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}}/>}<div className="crop-mask"/></div><label className="crop-zoom"><span>Zoom</span><input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label><p className="crop-help">Sleep de foto om hem goed uit te lijnen.</p><div className="crop-actions"><button className="secondary" onClick={onClose}>Annuleren</button><button className="primary" disabled={busy} onClick={save}>{busy?'Verwerken…':'Opslaan'}</button></div></section></div>
}

async function cropImageFile(file,{shape,zoom,offset,maxBytes}) {
  const image=await loadImageFile(file)
  const outW=shape==='circle'?512:1200, outH=shape==='circle'?512:675
  const base=Math.max(outW/image.width,outH/image.height)
  const scale=base*zoom
  const drawnW=image.width*scale, drawnH=image.height*scale
  const stageW=shape==='circle'?320:520, stageH=shape==='circle'?320:293
  const factor=outW/stageW
  const dx=(outW-drawnW)/2 + offset.x*factor
  const dy=(outH-drawnH)/2 + offset.y*factor
  const canvas=document.createElement('canvas'); canvas.width=outW; canvas.height=outH
  const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,outW,outH); ctx.drawImage(image,dx,dy,drawnW,drawnH)
  let quality=.82, blob=await canvasToBlob(canvas,quality)
  while(blob.size>maxBytes && quality>.35){ quality-=.06; blob=await canvasToBlob(canvas,quality) }
  if(blob.size>maxBytes) throw new Error('Afbeelding blijft te groot. Kies een andere foto.')
  return blob
}

function playerSportLine(person) {
  if (!person) return 'Spelersgegevens nog niet ingesteld'
  const positions=[person.primary_position,...(person.secondary_positions||[])].filter(Boolean).join(' / ')
  const bits=[]
  if(positions) bits.push(positions)
  if(person.throws_hand) bits.push(`gooit ${person.throws_hand==='L'?'L':'R'}`)
  if(person.bats_side) bits.push(`slaat ${person.bats_side==='S'?'S':person.bats_side==='L'?'L':'R'}`)
  return bits.join(' · ') || 'Spelersgegevens nog niet ingesteld'
}

function PushOnboarding({ session, onOpen }) {
  const [enabled,setEnabled]=useState(true)
  useEffect(()=>{if(!session?.user?.id)return;supabase.from('push_subscriptions').select('id').eq('profile_id',session.user.id).eq('enabled',true).limit(1).then(({data})=>setEnabled(Boolean(data?.length)))},[session?.user?.id])
  if(enabled)return null
  return <button type="button" className="push-onboarding-card" onClick={onOpen}><span className="settings-icon"><Icon name="bell"/></span><span><strong>Meldingen inschakelen</strong><small>Ontvang trainingswijzigingen, herinneringen en teamberichten.</small></span><Icon name="chevron"/></button>
}

function ProfileAvatar({ person, size = 'normal' }) {
  const cls = `profile-avatar profile-avatar-${size}`
  return person?.avatar_url ? <img className={cls} src={person.avatar_url} alt={`Profielfoto ${personName(person)}`} /> : <span className={`${cls} profile-avatar-fallback`}>{initials(person)}</span>
}

async function compressImage(file, { maxWidth, maxHeight, maxBytes, square }) {
  const image = await loadImageFile(file)
  let sourceX = 0, sourceY = 0, sourceWidth = image.width, sourceHeight = image.height
  let width, height
  if (square) {
    const side = Math.min(image.width, image.height)
    sourceX = (image.width - side) / 2
    sourceY = (image.height - side) / 2
    sourceWidth = side; sourceHeight = side
    width = Math.min(maxWidth, side); height = width
  } else {
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
    width = Math.max(1, Math.round(image.width * scale))
    height = Math.max(1, Math.round(image.height * scale))
  }
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
  let quality = .82
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > maxBytes && quality > .38) {
    quality -= .07
    blob = await canvasToBlob(canvas, quality)
  }
  if (blob.size > maxBytes) throw new Error(`Afbeelding blijft te groot (${Math.round(blob.size/1024)} KB). Kies een andere foto.`)
  return blob
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Deze afbeelding kon niet worden gelezen.')) }
    image.src = url
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Afbeelding verwerken mislukt.')), 'image/webp', quality))
}

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

function normalizeTrainingEvent(row, eventTeamLinks = [], participantLinks = []) {
  const links = eventTeamLinks.filter(link => String(link.event_id) === String(row.id))
  const linkedTeams = links.map(link => link.teams).filter(Boolean)
  const teamIds = links.map(link => Number(link.team_id))
  if (!teamIds.length && row.team_id) teamIds.push(Number(row.team_id))
  return {
    id: row.id,
    uid: `training-${row.id}`,
    type: 'training',
    source: 'supabase',
    teamId: row.team_id,
    teamIds,
    teams: linkedTeams,
    guestProfileIds: participantLinks.filter(link => String(link.event_id) === String(row.id)).map(link => link.profile_id),
    title: row.title || 'Training',
    description: row.description || '',
    start: row.start_at,
    end: row.end_at,
    meetAt: row.meet_at,
    location: row.location_name || row.location_address || '',
    locationAddress: row.location_address || ''
  }
}

function eventTypeLabel(event) { return event?.type === 'training' ? 'Training' : 'Wedstrijd' }
function formatClock(value) { return value ? new Date(value).toLocaleTimeString('nl-NL', { hour:'2-digit', minute:'2-digit' }) : '' }
function toDateInput(value) { if (!value) return ''; const d=new Date(value); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function toTimeInput(value) { if (!value) return ''; const d=new Date(value); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function combineDateTime(date,time) { return new Date(`${date}T${time}:00`).toISOString() }
