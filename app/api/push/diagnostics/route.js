import { createECDH } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function decodeBase64Url(value) {
  if (!value) return Buffer.alloc(0)
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, 'base64')
}

function validateVapidPair(publicKey, privateKey) {
  try {
    const publicBytes = decodeBase64Url(publicKey)
    const privateBytes = decodeBase64Url(privateKey)
    if (privateBytes.length !== 32) {
      return { pairMatches: false, publicBytes: publicBytes.length, privateBytes: privateBytes.length, problem: `private key is ${privateBytes.length} bytes; verwacht 32` }
    }
    if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
      return { pairMatches: false, publicBytes: publicBytes.length, privateBytes: privateBytes.length, problem: `public key is ${publicBytes.length} bytes; verwacht 65-byte uncompressed P-256 key` }
    }
    const ecdh = createECDH('prime256v1')
    ecdh.setPrivateKey(privateBytes)
    const derived = ecdh.getPublicKey(null, 'uncompressed')
    return {
      pairMatches: derived.equals(publicBytes),
      publicBytes: publicBytes.length,
      privateBytes: privateBytes.length,
      problem: derived.equals(publicBytes) ? null : 'public en private VAPID-key horen niet bij dezelfde keypair'
    }
  } catch (error) {
    return { pairMatches: false, problem: error?.message || 'VAPID-key kon niet worden gevalideerd' }
  }
}

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
    const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim()
    const subject = (process.env.VAPID_SUBJECT || '').trim()
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) return Response.json({ error: 'Supabase-serverconfiguratie ontbreekt.' }, { status: 500 })

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData?.user) return Response.json({ error: 'Sessie is verlopen.' }, { status: 401 })

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: subscription } = await service.from('push_subscriptions').select('id, endpoint, enabled, updated_at').eq('profile_id', userData.user.id).eq('enabled', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()

    let endpointOrigin = null
    try { endpointOrigin = subscription?.endpoint ? new URL(subscription.endpoint).origin : null } catch {}

    const vapid = validateVapidPair(publicKey, privateKey)
    let subjectValid = false
    try {
      subjectValid = subject.startsWith('mailto:') || ['http:', 'https:'].includes(new URL(subject).protocol)
    } catch {
      subjectValid = subject.startsWith('mailto:') && subject.length > 7
    }

    return Response.json({
      ok: true,
      vapid: {
        ...vapid,
        publicKeyPresent: Boolean(publicKey),
        privateKeyPresent: Boolean(privateKey),
        subjectPresent: Boolean(subject),
        subjectValid
      },
      subscription: {
        found: Boolean(subscription),
        id: subscription?.id || null,
        endpointOrigin,
        enabled: subscription?.enabled ?? null
      }
    })
  } catch (error) {
    console.error('Push diagnostics failed', error)
    return Response.json({ error: error?.message || 'Pushdiagnose mislukt.' }, { status: 500 })
  }
}
