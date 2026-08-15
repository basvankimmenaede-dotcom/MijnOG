import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const secret = process.env.CRON_SECRET
    if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Niet toegestaan.' }, { status: 401 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:info@onzegezellen.nl'
    if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey) return Response.json({ error: 'Push-serverconfiguratie ontbreekt.' }, { status: 500 })
    webpush.setVapidDetails(subject, publicKey, privateKey)
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

    const now = Date.now()
    const from = new Date(now + 23 * 60 * 60 * 1000).toISOString()
    const to = new Date(now + 25 * 60 * 60 * 1000).toISOString()
    const { data: events, error: eventError } = await service.from('events').select('id,title,start_at').gte('start_at', from).lte('start_at', to)
    if (eventError) throw eventError
    if (!events?.length) return Response.json({ ok: true, checked: 0, sent: 0 })

    const eventIds = events.map(e => e.id)
    const { data: maybeRows, error: attendanceError } = await service.from('attendance').select('event_id,profile_id').in('event_id', eventIds).eq('status', 'maybe')
    if (attendanceError) throw attendanceError
    if (!maybeRows?.length) return Response.json({ ok: true, checked: events.length, sent: 0 })

    const profiles = [...new Set(maybeRows.map(r => r.profile_id))]
    const { data: subscriptions, error: subError } = await service.from('push_subscriptions').select('*').in('profile_id', profiles).eq('enabled', true)
    if (subError) throw subError
    const subsByProfile = new Map()
    for (const sub of subscriptions || []) {
      if (!subsByProfile.has(sub.profile_id)) subsByProfile.set(sub.profile_id, [])
      subsByProfile.get(sub.profile_id).push(sub)
    }

    const eventMap = new Map(events.map(e => [String(e.id), e]))
    let sent = 0
    for (const row of maybeRows) {
      const event = eventMap.get(String(row.event_id))
      if (!event) continue
      const type = 'maybe_24h'
      const { data: existing } = await service.from('push_notification_log').select('id').eq('profile_id', row.profile_id).eq('event_id', row.event_id).eq('notification_type', type).maybeSingle()
      if (existing) continue
      let delivered = 0
      for (const sub of subsByProfile.get(row.profile_id) || []) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: 'Ben je erbij?', body: `Je staat nog op Misschien voor ${event.title || 'de training'} van morgen. Geef Aanwezig of Afwezig door.`, url: '/?tab=Agenda', tag: `maybe-${row.event_id}` }))
          delivered++
          sent++
        } catch (pushError) {
          if ([404, 410].includes(pushError?.statusCode)) await service.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
      if (delivered) await service.from('push_notification_log').insert({ profile_id: row.profile_id, event_id: row.event_id, notification_type: type })
    }
    return Response.json({ ok: true, checked: events.length, candidates: maybeRows.length, sent })
  } catch (error) {
    return Response.json({ error: error?.message || 'Herinneringen verwerken mislukt.' }, { status: 500 })
  }
}
