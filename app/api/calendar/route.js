import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Serverconfiguratie ontbreekt.' }, { status: 500 })

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return NextResponse.json({ error: 'Sessie is verlopen. Log opnieuw in.' }, { status: 401 })

  const { data: connection, error: connectionError } = await supabase
    .from('calendar_connections')
    .select('ics_url,is_active')
    .eq('profile_id', userData.user.id)
    .eq('provider', 'foys')
    .maybeSingle()

  if (connectionError) return NextResponse.json({ error: 'Agendakoppeling kon niet worden gelezen.' }, { status: 500 })
  if (!connection?.is_active || !connection?.ics_url) return NextResponse.json({ events: [] })

  if (!isAllowedFoysUrl(connection.ics_url)) return NextResponse.json({ error: 'De opgeslagen FOYS-link is ongeldig.' }, { status: 400 })

  try {
    const response = await fetch(connection.ics_url, {
      cache: 'no-store',
      headers: { Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) throw new Error(`FOYS gaf status ${response.status}`)
    const text = await response.text()
    const now = Date.now() - 6 * 60 * 60 * 1000
    const events = parseICS(text)
      .filter(event => new Date(event.end || event.start).getTime() >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
    return NextResponse.json({ events }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ error: `FOYS-agenda kon niet worden opgehaald: ${error.message}` }, { status: 502 })
  }
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

function unfold(text) {
  return text.replace(/\n[ \t]/g, '')
}

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

function getField(fields, name) {
  return fields.find(field => field.name === name)
}

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
  // FOYS feeds for Dutch competitions are local event times when no Z suffix is supplied.
  // Returning an offset-less timestamp lets the browser render the same local clock time.
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
