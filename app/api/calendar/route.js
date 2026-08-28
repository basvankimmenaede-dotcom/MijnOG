import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Serverconfiguratie voor FOYS-sync ontbreekt.' }, { status: 500 })
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  if (userError || !userData?.user) return NextResponse.json({ error: 'Sessie is verlopen. Log opnieuw in.' }, { status: 401 })

  try {
    // v3.2.7: FOYS is uitsluitend een centrale databron. De Mijn OG-kalender leest nooit
    // rechtstreeks uit een persoonlijke feed. We verzamelen daarom centraal genoeg feeds
    // om alle actieve teams te dekken, zonder de paginalaad te blokkeren.
    const { data: teams, error: teamsError } = await service
      .from('teams')
      .select('id,name,sport,foys_match_text,is_active,season_id')
      .eq('is_active', true)
    if (teamsError) throw teamsError

    const { data: rawConnections, error: connectionError } = await service
      .from('calendar_connections')
      .select('id,profile_id,ics_url,is_active,updated_at')
      .eq('provider', 'foys')
      .eq('is_active', true)
      .not('ics_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (connectionError) throw connectionError

    const profileIds = [...new Set((rawConnections || []).map(row => row.profile_id).filter(Boolean))]
    let memberships = []
    if (profileIds.length) {
      const { data: membershipRows, error: membershipError } = await service
        .from('team_members')
        .select('profile_id,team_id')
        .in('profile_id', profileIds)
      if (membershipError) throw membershipError
      memberships = membershipRows || []
    }

    const teamIdsByProfile = new Map()
    for (const row of memberships) {
      if (!teamIdsByProfile.has(row.profile_id)) teamIdsByProfile.set(row.profile_id, new Set())
      teamIdsByProfile.get(row.profile_id).add(Number(row.team_id))
    }

    // v3.2.13: alle actieve, unieke FOYS-feeds meenemen. Een persoonlijke FOYS-feed
    // kan een ander wedstrijdpakket bevatten dan de feed van een teamgenoot. De oude
    // selectie "een feed per team" kon daardoor precies Toms geldige VS-2-feed overslaan.
    // De sync draait server-side/op de achtergrond en dedupliceert wedstrijden op UID.
    const seenUrls = new Set()
    const connections = (rawConnections || []).filter(connection => {
      const normalizedUrl = normalizeFoysUrl(connection?.ics_url)
      if (!normalizedUrl || seenUrls.has(normalizedUrl)) return false
      seenUrls.add(normalizedUrl)
      connection.ics_url = normalizedUrl
      return true
    })
    if (!connections.length) return NextResponse.json({ synced: 0, skipped: 0, feeds: 0, feedsFailed: 0 })

    const feedResults = await Promise.allSettled(connections.map(async connection => {
      const response = await fetch(connection.ics_url, {
        cache: 'no-store',
        redirect: 'follow',
        headers: {
          Accept: 'text/calendar,application/ics,text/plain;q=0.9,*/*;q=0.8',
          'User-Agent': 'MijnOG-FOYS-Sync/3.2.14'
        },
        signal: AbortSignal.timeout(15000)
      })
      if (!response.ok) throw new Error(`FOYS gaf status ${response.status}`)
      const text = await response.text()
      if (!/BEGIN:VCALENDAR/i.test(text) || !/BEGIN:VEVENT/i.test(text)) {
        throw new Error('De link gaf geen geldige ICS-kalender terug')
      }
      const events = parseICS(text)
      if (!events.length) throw new Error('De FOYS-feed bevatte geen leesbare wedstrijden')
      return events.map(event => ({ ...event, sourceProfileId: connection.profile_id }))
    }))

    const parsedEvents = feedResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
    const feedsFailed = feedResults.filter(result => result.status === 'rejected').length
    const feedErrors = feedResults.map((result, index) => {
      if (result.status !== 'rejected') return null
      let host = 'onbekend'
      try { host = new URL(connections[index]?.ics_url || '').hostname } catch {}
      return { connection_id: connections[index]?.id || null, host, error: String(result.reason?.message || result.reason || 'Onbekende fout') }
    }).filter(Boolean)
    if (!parsedEvents.length && feedsFailed === feedResults.length) {
      return NextResponse.json({ error: 'Geen van de gekoppelde FOYS-databronnen kon worden gelezen.', feedErrors }, { status: 502 })
    }

    // Dedupe dezelfde wedstrijd die in meerdere persoonlijke FOYS-feeds voorkomt.
    const uniqueEvents = new Map()
    for (const event of parsedEvents) {
      const key = `${event.uid || normalizeText(event.title)}|${event.start}`
      if (!uniqueEvents.has(key)) uniqueEvents.set(key, event)
    }

    let skipped = 0
    const unmatched = []
    const matched = []
    for (const event of uniqueEvents.values()) {
      const match = bestTeamMatch(event, teams || [])
      if (!match.team) {
        skipped += 1
        unmatched.push({ title: event.title, start: event.start, matches: match.candidates.map(team => team.name) })
        continue
      }
      matched.push({ event, team: match.team })
    }

    if (!matched.length) {
      return NextResponse.json({ synced: 0, skipped, unmatched, feeds: connections.length, feedsFailed })
    }

    const years = [...new Set(matched.map(({ event }) => new Date(event.start).getFullYear()).filter(Boolean))]
    const competitionPairs = await Promise.all(years.map(async year => [year, await ensureFoysCompetition(service, year)]))
    const competitionIds = new Map(competitionPairs)

    const starts = matched.map(({ event }) => new Date(event.start).getTime()).filter(Number.isFinite)
    const minStart = new Date(Math.min(...starts) - 86400000).toISOString()
    const maxStart = new Date(Math.max(...starts) + 86400000).toISOString()
    const { data: existingRows, error: existingError } = await service
      .from('events')
      .select('id,team_id,start_at,external_source,external_uid,title,description,end_at,location_name,home_score,away_score,external_url,competition_id,created_by')
      .eq('type', 'game')
      .gte('start_at', minStart)
      .lte('start_at', maxStart)
    if (existingError) throw existingError

    const existingAtStart = new Map((existingRows || []).map(row => [`${Number(row.team_id)}|${new Date(row.start_at).toISOString()}`, row]))
    const existingByExternalUid = new Map((existingRows || []).filter(row => row.external_source === 'foys' && row.external_uid).map(row => [`foys|${row.external_uid}`, row]))
    const nowIso = new Date().toISOString()
    const bulkPayloads = []
    const manualMigrations = []

    for (const { event, team } of matched) {
      const year = new Date(event.start).getFullYear()
      const cancelled = isCancelled(event)
      const isPast = new Date(event.end || event.start).getTime() < Date.now()
      const score = parseScore(event)
      const uid = event.uid || `${normalizeText(event.title)}|${event.start}`
      const sameStart = existingAtStart.get(`${Number(team.id)}|${new Date(event.start).toISOString()}`)
      const existingFoys = existingByExternalUid.get(`foys|${uid}`) || (sameStart?.external_source === 'foys' ? sameStart : null)
      const existing = existingFoys || sameStart || null

      // v3.2.3: FOYS is een synchronisatiebron, geen wisactie. Sommige ICS-feeds leveren
      // bijvoorbeeld geen uitslag, locatie of omschrijving. In dat geval behouden we de
      // reeds opgeslagen/verrijkte databasewaarde in plaats van die met NULL te overschrijven.
      const payload = {
        team_id: Number(team.id),
        type: 'game',
        competition_id: competitionIds.get(year) || existing?.competition_id || null,
        status: cancelled ? 'cancelled' : (isPast ? 'played' : 'scheduled'),
        audience_mode: 'all',
        title: event.title || existing?.title || 'Wedstrijd',
        description: event.description || existing?.description || null,
        start_at: event.start,
        end_at: event.end || existing?.end_at || null,
        location_name: event.location || existing?.location_name || null,
        home_score: score?.home ?? existing?.home_score ?? null,
        away_score: score?.away ?? existing?.away_score ?? null,
        created_by: existing?.created_by || event.sourceProfileId,
        external_source: 'foys',
        external_uid: uid,
        external_url: event.url || existing?.external_url || null,
        updated_at: nowIso
      }
      if (sameStart?.id && sameStart.external_source !== 'foys') manualMigrations.push({ id: sameStart.id, payload })
      else bulkPayloads.push(payload)
    }

    const savedIds = []
    if (manualMigrations.length) {
      const migrated = await Promise.all(manualMigrations.map(async item => {
        const { data, error } = await service.from('events').update(item.payload).eq('id', item.id).select('id,team_id').single()
        if (error) throw error
        return data
      }))
      savedIds.push(...migrated)
    }

    if (bulkPayloads.length) {
      const { data: upserted, error: upsertError } = await service
        .from('events')
        .upsert(bulkPayloads, { onConflict: 'external_source,external_uid' })
        .select('id,team_id')
      if (upsertError) throw upsertError
      savedIds.push(...(upserted || []))
    }

    if (savedIds.length) {
      const links = [...new Map(savedIds.map(row => [`${row.id}|${row.team_id}`, { event_id: row.id, team_id: Number(row.team_id) }])).values()]
      const { error: linkError } = await service.from('event_teams').upsert(links, { onConflict: 'event_id,team_id', ignoreDuplicates: true })
      if (linkError) throw linkError
    }

    return NextResponse.json({
      synced: savedIds.length,
      skipped,
      unmatched: unmatched.slice(0, 25),
      feeds: connections.length,
      feedsFailed,
      feedErrors
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: `FOYS-agenda kon niet worden gesynchroniseerd: ${error.message}` }, { status: 502 })
  }
}

async function ensureFoysCompetition(service, year) {
  const { data: existing, error } = await service
    .from('competitions')
    .select('id')
    .is('team_id', null)
    .eq('season_year', year)
    .eq('source', 'foys')
    .order('id')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (existing?.id) return existing.id

  const { data: created, error: createError } = await service
    .from('competitions')
    .insert({
      team_id: null,
      season_year: year,
      name: `KNBSB Seizoen ${year}`,
      competition_type: 'competition',
      source: 'foys',
      is_active: true
    })
    .select('id')
    .single()
  if (createError) throw createError
  return created.id
}


function bestTeamMatch(event, teams) {
  const haystack = normalizeText(`${event.title || ''} ${event.description || ''}`)
  const scored = []
  for (const team of teams || []) {
    const aliases = String(team?.foys_match_text || '')
      .split(/[,;|\r\n]+/)
      .map(normalizeText)
      .filter(Boolean)
    const hits = aliases.filter(alias => haystack.includes(alias))
    if (!hits.length) continue
    const bestAlias = hits.sort((a,b) => b.length - a.length)[0]
    scored.push({ team, score: bestAlias.length, alias: bestAlias })
  }
  if (!scored.length) return { team: null, candidates: [] }
  scored.sort((a,b) => b.score - a.score || Number(a.team.id) - Number(b.team.id))
  const bestScore = scored[0].score
  const best = scored.filter(item => item.score === bestScore)
  if (best.length !== 1) return { team: null, candidates: best.map(item => item.team) }
  return { team: best[0].team, candidates: best.map(item => item.team) }
}

function eventMatchesTeam(event, team) {
  const haystack = normalizeText(`${event.title || ''} ${event.description || ''}`)
  const aliases = String(team?.foys_match_text || '')
    .split(/[,;|\n]+/)
    .map(normalizeText)
    .filter(Boolean)
  if (!aliases.length) return false
  return aliases.some(alias => haystack.includes(alias))
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isCancelled(event) {
  const text = normalizeText(`${event.title || ''} ${event.description || ''}`)
  return /\b(afgelast|afgelasting|cancelled|canceled|geannuleerd)\b/.test(text)
}

function parseScore(event) {
  const candidates = [event.description, event.title].filter(Boolean)
  for (const value of candidates) {
    const text = String(value)
    const explicit = text.match(/(?:uitslag|score)\s*[:\-]?\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i)
    if (explicit) return { home: Number(explicit[1]), away: Number(explicit[2]) }
  }
  return null
}

function normalizeFoysUrl(value) {
  try {
    let raw = String(value || '').trim()
    if (!raw) return null
    if (/^webcal:\/\//i.test(raw)) raw = raw.replace(/^webcal:/i, 'https:')
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    const allowedHost = host === 'foys.io' || host.endsWith('.foys.io') || host === 'foys.tech' || host.endsWith('.foys.tech')
    if (url.protocol !== 'https:' || !allowedHost) return null
    return url.toString()
  } catch {
    return null
  }
}

function isAllowedFoysUrl(value) {
  return Boolean(normalizeFoysUrl(value))
}

function parseICS(raw) {
  const text = unfold(raw.replace(/\r\n/g, '\n'))
  const blocks = text.split('BEGIN:VEVENT').slice(1).map(part => part.split('END:VEVENT')[0])
  return blocks.map(block => {
    const fields = parseFields(block)
    const startField = getField(fields, 'DTSTART')
    const endField = getField(fields, 'DTEND')
    return {
      uid: cleanText(getField(fields, 'UID')?.value || ''),
      title: cleanText(getField(fields, 'SUMMARY')?.value || 'Wedstrijd'),
      start: parseICalDate(startField),
      end: endField ? parseICalDate(endField) : null,
      location: cleanText(getField(fields, 'LOCATION')?.value || ''),
      description: cleanText(getField(fields, 'DESCRIPTION')?.value || ''),
      url: cleanText(getField(fields, 'URL')?.value || '')
    }
  }).filter(event => event.start)
}

function unfold(text) { return text.replace(/\n[ \t]/g, '') }

function parseFields(block) {
  return block.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const colon = line.indexOf(':')
    if (colon < 0) return null
    const head = line.slice(0, colon)
    const value = line.slice(colon + 1)
    const [name, ...paramParts] = head.split(';')
    const params = Object.fromEntries(paramParts.map(part => {
      const index = part.indexOf('=')
      return index > -1 ? [part.slice(0, index).toUpperCase(), part.slice(index + 1)] : [part.toUpperCase(), true]
    }))
    return { name: name.toUpperCase(), params, value }
  }).filter(Boolean)
}

function getField(fields, name) { return fields.find(field => field.name === name) }

function parseICalDate(field) {
  if (!field?.value) return null
  const value = field.value.trim()
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4)); const m = Number(value.slice(4, 6)) - 1; const d = Number(value.slice(6, 8))
    return new Date(y, m, d, 12, 0, 0).toISOString()
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/)
  if (!match) return null
  const [, y, mo, d, h, mi, s = '00', z] = match
  if (z) return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))).toISOString()
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`
}

function cleanText(value) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}
