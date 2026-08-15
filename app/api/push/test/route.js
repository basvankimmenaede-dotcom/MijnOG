import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function config() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:info@onzegezellen.nl'
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !publicKey || !privateKey) return null
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return { supabaseUrl, publishableKey, serviceRoleKey }
}

export async function POST(request) {
  try {
    const cfg = config()
    if (!cfg) return Response.json({ error: 'Push-serverconfiguratie ontbreekt.' }, { status: 500 })
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const userClient = createClient(cfg.supabaseUrl, cfg.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData?.user) return Response.json({ error: 'Sessie is verlopen.' }, { status: 401 })

    const service = createClient(cfg.supabaseUrl, cfg.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: subscriptions, error } = await service.from('push_subscriptions').select('*').eq('profile_id', userData.user.id).eq('enabled', true)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!subscriptions?.length) return Response.json({ ok: true, sent: 0 })

    let sent = 0
    for (const row of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title: 'Mijn OG werkt!', body: 'Pushmeldingen zijn succesvol gekoppeld.', url: '/?tab=Meer', tag: 'mijn-og-test' }))
        sent++
      } catch (pushError) {
        console.error('Push test failed', {
          subscriptionId: row.id,
          statusCode: pushError?.statusCode || null,
          body: pushError?.body || null,
          message: pushError?.message || String(pushError)
        })
        if ([404, 410].includes(pushError?.statusCode)) {
          await service.from('push_subscriptions').delete().eq('id', row.id)
        }
        return Response.json({
          error: 'Pushmelding kon niet worden afgeleverd.',
          statusCode: pushError?.statusCode || null,
          detail: pushError?.body || pushError?.message || 'Onbekende pushfout'
        }, { status: 502 })
      }
    }
    return Response.json({ ok: true, sent })
  } catch (error) {
    return Response.json({ error: error?.message || 'Testmelding mislukt.' }, { status: 500 })
  }
}
