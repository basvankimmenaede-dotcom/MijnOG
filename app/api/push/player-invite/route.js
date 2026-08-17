import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'https://mijn-og-v2.vercel.app'
    if (!url || !pub || !serviceKey || !vapidPublic || !vapidPrivate) return Response.json({ error: 'Push-serverconfiguratie ontbreekt.' }, { status: 500 })

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/, '')
    const body = await request.json()
    const userClient = createClient(url, pub, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData } = await userClient.auth.getUser(token)
    if (!userData?.user) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: requestRow } = await service.from('player_requests').select('requesting_team_id').eq('id', body.requestId).maybeSingle()
    if (!requestRow) return Response.json({ error: 'Verzoek niet gevonden.' }, { status: 404 })
    const { data: profile } = await service.from('profiles').select('role').eq('id', userData.user.id).single()
    const { data: membership } = await service.from('team_members').select('member_role').eq('profile_id', userData.user.id).eq('team_id', requestRow.requesting_team_id).maybeSingle()
    if (profile?.role !== 'admin' && membership?.member_role !== 'coach') return Response.json({ error: 'Geen rechten.' }, { status: 403 })

    const ids = [...new Set((body.profileIds || []).filter(Boolean))]
    const { data: subscriptions } = ids.length ? await service.from('push_subscriptions').select('*').in('profile_id', ids).eq('enabled', true) : { data: [] }
    webpush.setVapidDetails(subject, vapidPublic, vapidPrivate)
    let sent = 0
    for (const row of subscriptions || []) {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title: body.title || 'Uitnodiging om mee te spelen', body: body.body || 'Je hebt een nieuwe uitnodiging in Mijn OG.', url: '/', tag: `player-invite-${body.requestId}` }))
        sent++
      } catch (error) {
        if ([404, 410].includes(error?.statusCode)) await service.from('push_subscriptions').delete().eq('id', row.id)
      }
    }
    return Response.json({ ok: true, sent })
  } catch (error) {
    return Response.json({ error: error?.message || 'Push mislukt.' }, { status: 500 })
  }
}
