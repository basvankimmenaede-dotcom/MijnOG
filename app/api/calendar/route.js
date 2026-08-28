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

  const { data: connection, error: connectionError } = await userClient
    .from('calendar_connections')
    .select('id,profile_id,ics_url,is_active')
    .eq('profile_id', userData.user.id)
    .eq('provider', 'foys')
    .maybeSingle()

  if (connectionError) return NextResponse.json({ error: 'Agendakoppeling kon niet worden gelezen.' }, { status: 500 })
  if (!connection?.is_active || !connection?.ics_url) return NextResponse.json({ synced: 0, skipped: 0 })
  if (!isAllowedFoysUrl(connection.ics_url)) return NextResponse.json({ error: 'De opgeslagen FOYS-link is ongeldig.' }, { status: 400 })

  try {
    const response = await fetch(connection.ics_url, {
      cache: 'no-store',
      headers: { Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) throw new Error(`FOYS gaf status ${response.status}`)

    const text = await response.text()
    const parsedEvents = parseICS(text).sort((a, b) => new Date(a.start) - new Date(b.start))
    const { data: teams, error: teamsError } = await service
      .from('teams')
      .select('id,name,sport,foys_match_text,is_active,season_id')
      .eq('is_active', true)
    if (teamsError) throw teamsError

    let synced = 0
    let skipped = 0
    const unmatched = []

    for (const event of parsedEvents) {
      const matches = (teams || []).filter(team => eventMatchesTeam(event, team))
      if (matches.length !== 1) {
        skipped += 1
        unmatched.push({ title: event.title, start: event.start, matches: matches.map(team => team.name) })
        continue
      }

      const team = matches[0]
      const year = new Date(event.start).getFullYear()
      const competitionId = await ensureFoysCompetition(service, year)
      const cancelled = isCancelled(event)
      const isPast = new Date(event.end || event.start).getTime() < Date.now()
      const score = parseScore(event)
      const uid = event.uid || `${normalizeText(event.title)}|${event.start}`

      const payload = {
        team_id: Number(team.id),
        type: 'game',
        competition_id: competitionId,
        status: cancelled ? 'cancelled' : (isPast ? 'played' : 'scheduled'),
        audience_mode: 'all',
        title: event.title || 'Wedstrijd',
        description: event.description || null,
        start_at: event.start,
        end_at: event.end || null,
        location_name: event.location || null,
        home_score: score?.home ?? null,
        away_score: score?.away ?? null,
        created_by: connection.profile_id,
        external_source: 'foys',
        external_uid: uid,
        external_url: event.url || null,
        updated_at: new Date().toISOString()
      }

      // Historische wedstrijden kunnen al handmatig in public.events staan.
      // Koppel FOYS dan aan die bestaande wedstrijd in plaats van een duplicaat te maken.
      const { data: existingAtStart, error: existingError } = await service
        .from('events')
        .select('id,external_source,external_uid')
        .eq('team_id', Number(team.id))
        .eq('type', 'game')
        .eq('start_at', event.start)
        .order('id')
        .limit(1)
        .maybeSingle()
      if (existingError) throw existingError

      let saved
      if (existingAtStart?.id) {
        const { data: updated, error: updateError } = await service
          .from('events')
          .update(payload)
          .eq('id', existingAtStart.id)
          .select('id')
          .single()
        if (updateError) throw updateError
        saved = updated
      } else {
        const { data: upserted, error: saveError } = await service
          .from('events')
          .upsert(payload, { onConflict: 'external_source,external_uid' })
          .select('id')
          .single()
        if (saveError) throw saveError
        saved = upserted
      }

      const { error: linkError } = await service
        .from('event_teams')
        .upsert({ event_id: saved.id, team_id: Number(team.id) }, { onConflict: 'event_id,team_id', ignoreDuplicates: true })
      if (linkError) throw linkError
      synced += 1
    }

    return NextResponse.json({ synced, skipped, unmatched }, { headers: { 'Cache-Control': 'private, no-store' } })
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

function isAllowedFoysUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'api.foys.io' && /\/competition\/public-api\/v1\/persons\/[^/]+\/ics\/?$/.test(url.pathname)
  } catch {
    return false
  }
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
